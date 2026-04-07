

## Plano: Contas Bancárias com Extrato e Conciliação

### Resumo

Implementar o cadastro de contas bancárias por empresa, vincular cada movimentação financeira (recebimento e despesa) a uma conta, e exibir extrato com saldo atualizado. O cadastro completo ficará em **Operações** e um atalho rápido no **Financeiro**.

---

### 1. Banco de dados

**Nova tabela `company_bank_accounts`:**
- `id`, `company_id` (FK), `name` (ex: "Bradesco PJ"), `bank_name`, `agency`, `account_number`, `account_type` (corrente/poupança/digital/caixa), `initial_balance` (saldo inicial), `is_active`, `is_default`, `created_at`
- RLS: acesso restrito por `company_id` via `get_user_company_ids()`

**Alterações em tabelas existentes:**
- `event_payments`: adicionar coluna `bank_account_id uuid REFERENCES company_bank_accounts(id)` (nullable)
- `company_expenses`: adicionar coluna `bank_account_id uuid REFERENCES company_bank_accounts(id)` (nullable)

---

### 2. Componentes novos

**`BankAccountsManager.tsx`** (cadastro completo em Operações):
- CRUD de contas bancárias (nome, banco, agência, conta, tipo, saldo inicial, ativa/inativa, conta padrão)
- Lista em cards com badge do tipo e toggle ativo/inativo

**`BankAccountSelect.tsx`** (dropdown reutilizável):
- Select que carrega contas ativas da empresa
- Botão "+" inline para criar conta rápida sem sair da tela (usado no Financeiro)

**`BankAccountStatement.tsx`** (extrato por conta):
- Lista cronológica de movimentações (entradas de `event_payments` + saídas de `company_expenses`) filtradas por `bank_account_id`
- Saldo calculado: `initial_balance + sum(entradas) - sum(saídas)`
- Filtro por período

---

### 3. Integração nos dialogs existentes

- **`MarkExpensePaidDialog.tsx`**: adicionar `BankAccountSelect` — "De qual conta saiu?"
- **`EventFinancialTab.tsx` (marcar parcela como paga)**: adicionar `BankAccountSelect` — "Em qual conta entrou?"
- **`ExpenseFormDialog.tsx`**: adicionar `BankAccountSelect` para despesas já criadas como pagas
- **`PaymentFormDialog.tsx`**: adicionar `BankAccountSelect` opcional

---

### 4. Integração nas páginas

**Operações (`Formularios.tsx`):**
- Nova seção/tab "Contas Bancárias" com `BankAccountsManager` (CRUD completo)

**Financeiro (`Financeiro.tsx`):**
- Nova tab "Contas" com lista resumida das contas + saldo atual + botão "Ver extrato" (abre `BankAccountStatement`)
- Botão "+" para criar conta rápida
- Filtro global opcional por conta bancária nos recebimentos e despesas

---

### 5. Hook

**`useBankAccounts.ts`:**
- Carrega contas da empresa, CRUD, calcula saldo virtual por conta (query agregada de payments + expenses)

---

### Detalhes técnicos

- A coluna `bank_account_id` é **nullable** em ambas as tabelas — funcionalidade é aditiva e não quebra o fluxo atual
- Saldo é calculado dinamicamente (não armazenado) para evitar inconsistências
- Permissões: herda as permissões financeiras existentes (`financial.view`, `financial.edit`)
- A conta tipo "Caixa" funciona como as demais, representando dinheiro físico

