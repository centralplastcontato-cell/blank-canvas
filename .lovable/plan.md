

## Plano: Sistema de Consentimento Financeiro

### O que é

Uma camada opcional de aprovação para ações financeiras. Quando ativada, ações como "baixar parcela" ou "pagar despesa" não são efetivadas imediatamente -- ficam em estado de "aguardando consentimento" até que um gestor/dono aprove.

### Como funciona

```text
Funcionário marca parcela como paga
        ↓
  Consentimento ativo?
   /           \
  NÃO          SIM
   ↓             ↓
Efetiva       Cria registro em
direto        financial_consents
               (status: pending)
                  ↓
            Aparece na aba
            "Consentimento"
            do Financeiro
                  ↓
            Gestor/Dono aprova
                  ↓
            Sistema efetiva a ação
            (marca como pago no banco)
```

### Banco de Dados

**1. Nova tabela `financial_consents`:**
- `id`, `company_id`, `action_type` (payment_paid, expense_paid), `entity_id` (ID da parcela ou despesa), `entity_table` (event_payments ou company_expenses)
- `payload` (JSONB - dados da ação: bank_account_id, receipt_url, etc.)
- `requested_by` (quem solicitou), `requested_at`
- `status` (pending, approved, rejected)
- `reviewed_by`, `reviewed_at`, `review_notes`
- RLS com `get_user_company_ids`

**2. Nova permissão `financial.consent`:**
- Inserir na tabela `permission_definitions` com categoria "Financeiro"
- Quando `granted = true` para um usuário, ações financeiras desse usuário passam pelo fluxo de consentimento
- Gestores/admins aprovam (eles mesmos ficam isentos por padrão)

### Frontend

**3. Hook `useFinancialConsent`:**
- Verifica se o usuário atual tem `financial.consent` ativo
- Função `requiresConsent()` retorna boolean
- Função `submitForConsent(actionType, entityId, payload)` cria o registro pendente
- Função `approveConsent(id)` / `rejectConsent(id)` para gestores

**4. Interceptar ações existentes:**
- Em `useFinanceiroDashboard.markPaymentAsPaid`: antes de efetivar, checar se requer consentimento. Se sim, criar registro pendente + toast "Enviado para aprovação"
- Em `MarkExpensePaidDialog`: mesma lógica
- Em `EventFinancialTab.confirmMarkAsPaid`: mesma lógica

**5. Nova aba "Consentimento" no Financeiro:**
- Aparece apenas para gestores/admins (ou quem tem permissão de aprovar)
- Lista cards pendentes com: descrição da ação, valor, quem solicitou, data
- Botões Aprovar / Rejeitar em cada card
- Ao aprovar: executa a ação original (update no banco) e marca como approved
- Badge com contador de pendentes na aba

**6. Painel de Permissões:**
- Adicionar `financial.consent` no `PermissionsPanel` sob categoria "Financeiro"
- Label: "Requer consentimento financeiro"
- Descrição: "Ações financeiras deste usuário precisam de aprovação"

### Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| Migration SQL | Nova tabela + RLS + permission_definition |
| `src/hooks/useFinancialConsent.ts` | Novo hook |
| `src/hooks/useFinancialPermissions.ts` | Adicionar `requiresConsent` |
| `src/hooks/useFinanceiroDashboard.ts` | Interceptar `markPaymentAsPaid` |
| `src/components/financial/MarkExpensePaidDialog.tsx` | Interceptar confirmação |
| `src/components/financial/EventFinancialTab.tsx` | Interceptar `confirmMarkAsPaid` |
| `src/pages/Financeiro.tsx` | Nova aba "Consentimento" |
| `src/components/financial/ConsentTab.tsx` | Novo componente da aba |
| `src/components/financial/ConsentCard.tsx` | Card de item pendente |

