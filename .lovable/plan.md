

# Pagamentos Parciais (Sub-Pagamentos) dentro de Parcelas

## Resumo

Criar um sistema de **pagamentos parciais** onde uma parcela pode receber múltiplos pagamentos até atingir seu valor total. Exemplo: parcela de R$10.000 → cliente paga R$2.000 → saldo restante R$8.000.

## O que já temos

- Tabela `event_payments` com parcelas, status, valores
- Sistema de consentimento financeiro (`financial_consents`) já funcional
- Timeline financeira para auditoria
- Upload de comprovantes via bucket `expense-receipts`
- Hook `useEventFinancial` com CRUD completo

## O que precisa ser criado

### 1. Migration — Nova tabela `event_payment_entries`

```sql
CREATE TABLE public.event_payment_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.event_payments(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  amount numeric(12,2) NOT NULL,
  paid_at timestamptz NOT NULL DEFAULT now(),
  payment_method text,
  bank_account_id uuid REFERENCES public.company_bank_accounts(id),
  receipt_url text,
  paid_by text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

Com RLS via `get_user_company_ids` e índice em `payment_id`.

### 2. Lógica de negócio — Hook `useEventFinancial`

- Nova função `addPartialPayment(paymentId, { amount, method, bankAccountId, receiptUrl, paidBy, notes })`
- Ao adicionar sub-pagamento: se soma dos entries >= valor da parcela → marcar parcela como `paid`
- Nova função `deletePartialPayment(entryId)`
- Carregar entries junto com payments (`fetchAll` busca `event_payment_entries`)
- Recalcular `receivedAmount` baseado na soma dos entries (não mais só parcelas com status `paid`)

### 3. Integração com Consentimento

- Novo `action_type: 'partial_payment'` no consent flow
- Se usuário tem `financial.consent`, sub-pagamento vai para aprovação
- No `approveConsent`, inserir o entry e recalcular status da parcela

### 4. UI — Card de parcela expandível

Dentro de `EventFinancialTab`, cada parcela pendente/atrasada ganha:
- Botão "Pagamento Parcial" (ícone de moeda cortada)
- Ao clicar, abre dialog com: valor, método, conta bancária, comprovante (upload), quem pagou, data/hora
- Barra de progresso mostrando quanto já foi pago vs total
- Lista dos sub-pagamentos já feitos com data, valor, quem pagou, e link do comprovante
- Saldo restante em destaque

### 5. UI — Visão no Dashboard Financeiro

- `FinancialPaymentCard` e `KpiSheetBody` mostram parcelas com entries como "parcialmente pago"
- Novo badge: "Parcial" (amarelo/laranja) quando tem entries mas não está 100% pago

### 6. Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| Nova migration | Tabela `event_payment_entries` + RLS |
| `useEventFinancial.ts` | Fetch entries, `addPartialPayment`, recalc logic |
| `EventFinancialTab.tsx` | UI expandível com entries, dialog de pagamento parcial, upload |
| `useFinancialConsent.ts` | Handler para `partial_payment` |
| `ConsentTab.tsx` | Renderizar consents de pagamento parcial |
| `PaymentFormDialog.tsx` | Novo modo "parcial" com campo de comprovante |
| `useFinanceiroDashboard.ts` | Considerar entries no cálculo de recebido |
| `BankAccountStatement.tsx` | Incluir entries como movimentações |

## Complexidade

Moderada — temos 80% da infraestrutura pronta (consentimento, timeline, upload, bank accounts). O trabalho principal é a nova tabela, a lógica de soma parcial, e a UI expandível nos cards de parcela.

## Implementação

Passo a passo conforme sua preferência:
1. Migration da tabela
2. Hook com CRUD de entries
3. UI do card expandível + dialog
4. Integração com consentimento
5. Ajuste no dashboard financeiro e extrato

