

## Plano: Filtro por Período Flexivel no Financeiro

### O que muda para o usuario

O seletor de mes atual ("janeiro", "fevereiro"...) sera substituido por um sistema com:
- **Presets rapidos**: Mes atual, Bimestre, Trimestre, Semestre, Ano inteiro
- **Periodo personalizado**: calendario para escolher data inicio e fim livremente
- **Badge visual** mostrando o periodo ativo com botao de limpar

### Alteracoes tecnicas

**1. Hook `src/hooks/useFinanceiroDashboard.ts`**
- Trocar `filters.month` (string `yyyy-MM`) por `filters.from` e `filters.to` (strings `yyyy-MM-dd`)
- Default: mes atual (startOfMonth -> endOfMonth de hoje)
- Usar `from`/`to` em todas as agregacoes mensais (recebido, pendente, despesas do periodo, saldo)
- Remover calculo de `monthStart`/`monthEnd` a partir de `filters.month`

**2. Pagina `src/pages/Financeiro.tsx`**
- Remover o `<Select>` de meses e o array `months`
- Adicionar presets como botoes pill-shaped (mesmo padrao visual das sub-abas):
  - "Mes" (mes atual), "Bimestre" (2 meses), "Trimestre" (3 meses), "Semestre" (6 meses), "Ano" (ano inteiro)
- Adicionar botao "Personalizado" que abre um Popover com Calendar mode="range" (igual ao PeriodFilterPopover ja existente na Agenda)
- Mostrar badge com periodo ativo e botao X para voltar ao default (mes atual)
- Resetar paginacoes ao trocar periodo

**3. Impacto**
- Sem migration, sem mudanca de banco
- Cards de resumo, aba Resultado e aba Receitas passam a refletir o periodo selecionado
- Aba Despesas continua mostrando todas (sem filtro temporal), conforme ja implementado

