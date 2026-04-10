

## Diagnóstico do Bug

O problema está na função `syncPaymentDetails` em `src/pages/Agenda.tsx` (linhas 718-781). Quando um evento é salvo/criado, essa função cria os registros de pagamento (`event_payments`) com os **valores BRUTOS** (sem descontar as taxas de cartão).

Enquanto isso, a lógica de "backfill" nos hooks `EventFinancialTab` e `useFinanceiroDashboard` aplica corretamente as taxas de cartão — mas essas funções só rodam quando **não existem** pagamentos prévios. Como `syncPaymentDetails` já cria os registros brutos primeiro, o backfill nunca é acionado.

**Resultado**: O evento "Noah 5 anos" tem:
- Entrada: R$ 1.900 armazenado (bruto) em vez de ~R$ 1.795,69 (líquido com 5,49%)
- Parcelas: 5x R$ 800 (bruto) em vez de valor líquido
- O extrato bancário mostra +R$ 1.900 quando deveria mostrar o valor líquido
- Os cards financeiros do evento mostram valores brutos

## Plano de Correção

### 1. Corrigir `syncPaymentDetails` em Agenda.tsx
Adicionar a mesma lógica de dedução de taxas de cartão que já existe no backfill:
- Buscar `company_card_fees` ativas para a empresa
- Se `entrada_forma === "cartao"`, aplicar taxa baseada em `entrada_parcelas`
- Se `saldo_forma === "cartao"`, aplicar taxa baseada em `parcelas` e criar linha única (sem splitar parcelas)
- Parcelas de cartão não devem ser splitadas em múltiplas linhas

### 2. Corrigir os dados existentes do "Noah 5 anos"
Via migração SQL, recalcular os valores das parcelas pendentes aplicando a taxa de 5,49%:
- Entrada paga (R$ 1.900): já está marcada como paga, o valor no banco precisa ser corrigido para ~R$ 1.795,69
- 5 parcelas pendentes de R$ 800: devem ser consolidadas em 1 parcela de ~R$ 3.780,40 (R$ 4.000 - 5,49%)

### Resultado Esperado
- Novos eventos com pagamento cartão terão valores líquidos corretos
- O extrato bancário refletirá o valor que realmente cai na conta
- Os cards financeiros mostrarão valores líquidos
- O card de "Taxas de Cartão" continuará mostrando o valor bruto vs líquido para referência

