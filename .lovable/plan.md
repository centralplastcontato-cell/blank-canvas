

## Problema

Quando você cria um **Ajuste de Saldo** (ex: R$ 305.348,90), esse valor é somado nos cards **"Despesas Lançadas"** e **"Despesas Pagas"**, inflando os totais e confundindo a leitura financeira. O ajuste de saldo não é uma despesa real — é apenas uma calibragem do saldo inicial.

## Solução

Excluir registros do tipo `expense_type === 'ajuste'` dos cálculos de KPI de despesas, mantendo-os apenas onde fazem sentido (saldo de contas e extrato bancário).

## Alterações

### 1. `src/hooks/useFinanceiroDashboard.ts`
- Nos cálculos de `totalExpensesMonth` e `totalExpensesPaidMonth` (linhas 335-337), filtrar para ignorar despesas com `expense_type === 'ajuste'`
- No cálculo de `saldoMonth`, também usar apenas despesas reais (sem ajustes)
- Isso garante que os cards "Despesas Lançadas", "Despesas Pagas" e "Saldo" no dashboard mostrem apenas despesas operacionais

### 2. `src/pages/Financeiro.tsx`
- Na aba **Resultado**, onde já aparece uma linha separada "Ajustes de saldo" (linha 858), garantir que o "Total despesas" da tabela de resultado também exclua ajustes
- Opcionalmente, manter a linha informativa "Ajustes de saldo" na aba Resultado para transparência

### O que NÃO muda
- O extrato bancário (`BankAccountStatement`) continua exibindo os ajustes normalmente
- O cálculo de saldo por conta (`useBankAccounts`) continua incluindo ajustes (pois eles afetam o saldo real da conta)
- A lista de despesas na aba "Despesas" continua mostrando ajustes (para auditoria)

## Detalhes técnicos

```typescript
// useFinanceiroDashboard.ts — filtro nas linhas 335-337
const realExpensesThisMonth = expensesThisMonth.filter(e => e.expense_type !== 'ajuste');
const totalExpensesMonth = realExpensesThisMonth.reduce((s, e) => s + e.amount, 0);
const totalExpensesPaidMonth = realExpensesThisMonth.filter(e => e.status === 'pago').reduce((s, e) => s + e.amount, 0);
const saldoMonth = totalReceivedMonth - totalExpensesMonth;
```

