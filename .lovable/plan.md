

# Passo 5: Dashboard Financeiro + Extrato com Pagamentos Parciais

## Resumo

Ajustar o dashboard financeiro e o extrato bancário para reconhecer pagamentos parciais (sub-pagamentos via `event_payment_entries`), mostrando badge "Parcial" e calculando valores recebidos com base nas entries.

## Mudanças

### 1. `EnrichedPayment` — Novo campo `entries_total`

Adicionar `entries_total` ao tipo `EnrichedPayment` para carregar a soma dos sub-pagamentos de cada parcela. Isso permite ao dashboard saber se uma parcela tem pagamentos parciais.

### 2. `useFinanceiroDashboard.ts` — Fetch entries + recalcular totais

- No `fetchData`, buscar `event_payment_entries` com `company_id` e agrupar por `payment_id`
- Enriquecer cada payment com `entries_total` (soma dos entries daquela parcela)
- No cálculo de `totalReceivedMonth`: incluir entries de parcelas não-pagas no período (entries com `paid_at` no range), além dos payments com status `paid`
- Parcelas com entries > 0 mas < amount ficam com status visual "partial" (sem alterar o DB)

### 3. `EnrichedPayment` status — Adicionar `'partial'`

Expandir o tipo de status para incluir `'partial'` quando `entries_total > 0 && entries_total < amount && status !== 'paid'`.

### 4. `FinancialPaymentCard.tsx` — Badge "Parcial" + barra de progresso

- Novo entry em `statusConfig`: `partial` com cor laranja/amarela
- Novo entry em `borderColors`: `partial` com `border-l-orange-500`
- Mostrar barra de progresso mini quando `entries_total > 0` (pago X de Y)

### 5. `KpiSheetBody.tsx` — Badge "Parcial" nas listas

- Na renderização de payments, identificar status `partial` e mostrar badge correspondente

### 6. `BankAccountStatement.tsx` — Incluir entries como movimentações

- Além de buscar `event_payments` com `status=paid`, buscar `event_payment_entries` com `bank_account_id` do account
- Mapear entries como movimentações individuais (tipo "entry", com descrição "Pagamento Parcial — [notes]")
- Incluir entries nos cálculos de `postEntries` para saldo correto

## Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useFinanceiroDashboard.ts` | Fetch entries, enriquecer payments com `entries_total`, recalcular `totalReceivedMonth` |
| `src/components/financial/FinancialPaymentCard.tsx` | Badge "Parcial", barra de progresso, cores |
| `src/components/financial/KpiSheetBody.tsx` | Badge "Parcial" nas listas |
| `src/components/financial/BankAccountStatement.tsx` | Entries como movimentações no extrato |

## Ordem de implementação

1. Tipo `EnrichedPayment` + fetch entries no hook
2. `FinancialPaymentCard` com badge + progress
3. `KpiSheetBody` com badge
4. `BankAccountStatement` com entries

