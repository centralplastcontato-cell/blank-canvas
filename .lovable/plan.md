
Objetivo: fazer a aba **Despesas** sempre listar todas as despesas cadastradas (independente do mês da data), enquanto o filtro de mês continua valendo para os **totais/métricas**.

1) Diagnóstico confirmado
- Hoje a lista da aba Despesas usa `dashboard.expensesThisMonth` em `src/pages/Financeiro.tsx`.
- Isso limita a visualização ao mês selecionado, por isso lançamentos de abril/maio “somem” quando o mês ativo é outro.

2) Ajuste no hook de dados (`src/hooks/useFinanceiroDashboard.ts`)
- Separar claramente dois conjuntos:
  - **Lista base de despesas** (filtrada só por `unit` e `status`, sem filtro de mês).
  - **Despesas do mês selecionado** (para KPIs e resultado).
- Manter `totalExpensesMonth` e `saldoMonth` baseados apenas no período mensal.
- Expor no retorno nomes explícitos (ex.: `expensesList` para lista geral e `expensesThisMonth` para métricas), evitando confusão de uso.

3) Ajuste na UI da página (`src/pages/Financeiro.tsx`)
- Aba **Despesas**:
  - Trocar `dashboard.expensesThisMonth` pela lista geral (`dashboard.expensesList`/equivalente).
  - Manter segmentação por tipo (fixa/variável/festa), paginação e cards.
- Aba **Resultado** e cards do topo:
  - Continuar usando os dados mensais (`expensesThisMonth`, `totalExpensesMonth`, `saldoMonth`) para preservar o comportamento analítico por período.

4) Correções de UX para evitar “parece vazio”
- Atualizar textos de estado vazio da aba Despesas para refletir “sem despesas cadastradas” (não “neste período”).
- Resetar `pageDespesas` para 1 quando filtros mudarem, evitando página vazia por paginação antiga.

5) Compatibilidade e impacto
- Sem mudança de banco/migration.
- Sem alteração de inserção/edição/exclusão; apenas regra de exibição e separação de responsabilidades entre lista e métricas.

6) Validação após implementação
- Criar despesas em meses diferentes (abril, maio, junho) e confirmar que todas aparecem na aba Despesas.
- Trocar mês no filtro e confirmar que apenas os **cards/totais** mudam.
- Validar em mobile (402x568) que a lista continua legível e sem regressão de layout/paginação.
