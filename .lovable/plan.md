## Diagnóstico

No evento da Tania/Kaleb, o painel "Taxas de Cartão" só desconta R$ 11,56 (taxa da entrada de R$ 400). A perda do parcelamento de **R$ 4.572 em 10x** não aparece — e por isso o "Recebido" mostra R$ 4.960,84 como se o saldo tivesse entrado integral.

A causa são duas lacunas no cálculo:

1. **Painel `cardFeeLoss` lê só `payment_details`.** Se a parcela de saldo foi criada/editada direto na lista (tabela `event_payments`) — como nesse evento, em que entrada e saldo aparecem com strings diferentes (`cartao` vs `Cartão Crédito`) e operadoras diferentes (Nubank na linha, Infinitepay no snapshot) — o JSON `saldo_forma` não bate, e a parcela inteira é ignorada no painel.
2. **Auto-sync que congela taxa em `event_payments` só roda quando não há parcelas** (`if (financial.payments.length > 0) return;`). Eventos antigos que já tinham linhas criadas nunca receberam `card_fee_percent`/`gross_amount`/`card_operator_id` — então `adjustedSummary` também não consegue compensar.

## Mudanças

### 1) `src/components/financial/EventFinancialTab.tsx` — `cardFeeLoss` baseado nas parcelas reais

Reescrever o `useMemo cardFeeLoss` (linhas 626-710) para iterar sobre `financial.payments` (fonte da verdade), não sobre `payment_details`:

Para cada parcela em `event_payments`:
- Se `payment_method` for cartão (qualquer variante: `cartao`, `cartao_credito`, `cartao_debito`), calcular a perda.
- **Fonte da taxa, em ordem de prioridade:**
  1. `card_fee_percent` da própria parcela (selo congelado mais confiável)
  2. Snapshot em `payment_details` (`entrada_taxa_percent`/`saldo_taxa_percent`) quando o tipo bate
  3. Operadora atual: `card_operator_id` da parcela → senão `payment_details.card_operator_id` → senão `cardFees[0]`, usando `taxa_credito_${installments}x` ou `taxa_debito`.
- **Fonte do bruto:**
  1. `gross_amount` se presente
  2. Senão, inferir: `amount / (1 - taxa/100)` (revertendo o líquido) — só quando temos taxa.
  3. Se não houver taxa nem gross, ignora a linha (sem inflar nem chutar).
- Acumular `totalLoss` e empilhar `details` com tipo, bruto, taxa, parcelas.

Operadora exibida: priorizar `paymentDetails.card_operator_name` → senão a do `card_operator_id` da primeira parcela com cartão → senão `cardFees[0].operator_name`.

### 2) Mesma tela — backfill de selo nas parcelas existentes

No `useEffect` de auto-sync (linhas 120-243), separar a lógica em dois passos:

- **Passo A (já existe):** se não há parcelas, criar a partir de `payment_details`.
- **Passo B (novo):** se há parcelas mas alguma de cartão está sem `card_fee_percent`/`gross_amount`/`card_operator_id`, fazer um `UPDATE` por linha preenchendo:
  - `card_operator_id` ← `paymentDetails.card_operator_id` (ou `cardFees[0].id`)
  - `card_installments` ← do `payment_details` (entrada_parcelas / parcelas) conforme o tipo da linha; default 1
  - `card_fee_percent` ← snapshot do `payment_details` para o tipo correspondente; senão taxa atual da operadora para aquele número de parcelas
  - `gross_amount` ← `amount / (1 - card_fee_percent/100)` arredondado, **apenas se a parcela ainda não tiver `gross_amount`** e `card_fee_percent > 0`

Guardar com `syncAttempted.current` para rodar uma única vez por carga do componente. Não tocar em parcelas já marcadas como `paid` que tenham `gross_amount` definido (idempotente).

### 3) `adjustedSummary` continua igual

Como agora `card_fee_percent`/`gross_amount` ficarão preenchidos, o `adjustedSummary` (linhas 713-736) já passa a compensar corretamente sem alteração — o "Recebido" baixa para refletir a taxa do 10x.

## Resultado esperado para o evento da Tania/Kaleb

- O painel "Taxas de Cartão — Infinitepay" passa a listar **duas linhas**: entrada R$ 400 × 2,89% e parcela R$ 4.572 × (taxa de 10x da operadora congelada/atual).
- "Valor não arrecadado" passa de R$ 11,56 para o total real (entrada + 10x).
- "Recebido" cai do R$ 4.960,84 para o valor líquido correto. "Pendente" continua R$ 0 (cliente pagou o bruto integral).
- Eventos antigos sem snapshot recebem o selo da taxa **atual** no primeiro carregamento — a partir daí ficam congelados. Eventos novos já estavam corretos.

## Observação para a cliente

A correção só ajusta a **exibição** do painel e do "Recebido" (que estavam errados). O dinheiro que entrou na conta da operadora não muda — é exatamente o líquido que o banco creditou. O número que o sistema mostrava antes é que estava inflado por não descontar a taxa do 10x.
