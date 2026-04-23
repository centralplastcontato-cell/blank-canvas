

## Correção: Duplicação de parcelas ao editar evento com pagamentos já quitados

### Problema identificado

A função `syncPaymentDetails` em `Agenda.tsx` (linha 739) é chamada tanto na **criação** quanto na **edição** de eventos. Ao editar um evento que já possui pagamentos pagos:

1. O sistema mantém os pagamentos com `status === "paid"` (correto).
2. Deleta os pendentes (correto).
3. Recria **todas** as parcelas do `payment_details` como novos registros pendentes — **sem subtrair o valor já pago**.

Isso gera duplicação: os pagamentos pagos continuam existindo + novas parcelas são criadas para o valor total.

**Problema secundário:** A função não salva `gross_amount` nem `card_fee_percent` nos registros de `event_payments`, o que causa o problema de saldo fantasma já corrigido na camada de exibição.

### Solução

Alterar `syncPaymentDetails` em `src/pages/Agenda.tsx` para:

1. **Ao recriar parcelas com pagamentos pagos existentes**, buscar o `amount` (e `gross_amount`) dos pagamentos pagos e subtrair do total antes de criar novos registros pendentes.
2. **Salvar `gross_amount` e `card_fee_percent`** nos registros de card payment, para que o cálculo do hook seja preciso sem necessidade de ajuste na exibição.

### Alterações técnicas

**Arquivo:** `src/pages/Agenda.tsx`

**1. Buscar dados completos dos pagamentos existentes (linha ~743-746)**
- Alterar o `select` para incluir `amount, gross_amount, type, payment_method` além de `id, status`.

**2. Calcular valor já pago (após linha 754)**
- Quando `hasPaidPayments`, somar o `gross_amount || amount` dos pagamentos pagos para obter `paidGrossTotal`.
- Subtrair `paidGrossTotal` do valor total das novas parcelas antes de criá-las.
- Se o saldo restante for ≤ 0, não criar nenhum registro novo (tudo já está pago).

**3. Salvar `gross_amount` e `card_fee_percent` (linhas 782-815)**
- Na entrada com taxa de cartão: adicionar `gross_amount: pd.entrada_valor` e `card_fee_percent: feeRate`.
- Na parcela consolidada com taxa: adicionar `gross_amount: totalSaldo` e `card_fee_percent: saldoFeeRate`.

### Resultado esperado

- Ao editar um evento com pagamentos já quitados, o sistema não cria parcelas duplicadas.
- Novos registros de pagamento por cartão terão `gross_amount` correto, eliminando saldos fantasma para eventos futuros.
- Funciona para todos os clientes automaticamente.

