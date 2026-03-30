

## Entendimento

Duas necessidades:
1. **Ajuste de saldo inicial** — como a plataforma é nova e já havia receitas/despesas anteriores, é preciso um mecanismo para "equiparar o caixa" com o saldo real da empresa (um lançamento de ajuste).
2. **Campo de observações** no formulário de despesas — para descrever detalhes adicionais sobre a despesa.

## Solução

### 1. Campo "Observações" no formulário de despesa
- Adicionar um campo `notes` (textarea) no `ExpenseFormDialog`
- Adicionar coluna `notes text` na tabela `company_expenses` via migration
- Passar o campo no `onSubmit` e persistir via `addExpense`/`updateExpense` no hook

### 2. Ajuste de saldo inicial
- Adicionar uma nova categoria especial `ajuste_saldo` nas despesas com expense_type `ajuste`
- No Financeiro, adicionar um botão "Ajuste de Saldo" (na aba Resultado ou no header) que abre o `ExpenseFormDialog` pré-configurado com tipo "Ajuste de Saldo"
- Ajustes positivos = dinheiro que já estava no caixa (receita anterior à plataforma)
- Ajustes negativos = gastos que já haviam sido feitos
- O campo `notes` serve para documentar o motivo do ajuste (ex: "Saldo em caixa na data de início da plataforma")
- O saldo do dashboard incluirá automaticamente esses ajustes pois já soma/subtrai despesas

**Abordagem simplificada**: usar a própria tabela `company_expenses` com uma categoria `ajuste` para evitar criar nova tabela. Valores positivos representam dinheiro que entrou antes da plataforma, negativos representam gastos anteriores.

## Alterações

### Migration (nova)
```sql
ALTER TABLE public.company_expenses ADD COLUMN notes text;
```

### `src/components/financial/ExpenseFormDialog.tsx`
- Adicionar estado `notes` e campo `<Textarea>` com label "Observações (opcional)"
- Incluir `notes` no `onSubmit`
- Adicionar tipo "Ajuste de Saldo" ao `EXPENSE_TYPES`

### `src/hooks/useFinanceiroDashboard.ts`
- Atualizar interface `Expense` com campo `notes`
- Atualizar `addExpense` para aceitar `notes`
- Calcular ajustes de saldo separadamente no dashboard (ajustes positivos somam à receita, negativos somam às despesas)

### `src/pages/Financeiro.tsx`
- Adicionar botão "Ajuste de Saldo" no header ou aba Resultado
- Abrir o `ExpenseFormDialog` pré-configurado com tipo `ajuste`

## Detalhes técnicos
- Coluna `notes` é nullable (text) — sem impacto em registros existentes
- Ajustes de saldo usam `expense_type = 'ajuste'` para diferenciá-los de despesas normais
- O saldo mensal considera: Recebido + Ajustes positivos - Despesas - Ajustes negativos

