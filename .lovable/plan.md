
## Consulta de Festas por Periodo na Agenda

### O que sera feito
Adicionar um botao "Consultar periodo" ao lado dos cards de resumo da Agenda. Ao clicar, abre um popover com dois date pickers (data inicial e data final) e presets rapidos (ex: "Ultimo trimestre", "Proximo semestre", "Ano inteiro"). Ao confirmar, os cards de resumo mostram os totais do periodo selecionado (com um badge indicando o range ativo), e um botao para voltar a visao mensal normal.

### Como funciona

1. **Botao de ativacao**: Um botao discreto ("Consultar periodo") aparece acima ou ao lado dos `MonthSummaryCards`, no desktop e mobile.

2. **Popover com filtros**:
   - Dois date pickers: "De" e "Ate"
   - Presets rapidos: "Ultimo trimestre", "Proximo trimestre", "Semestre atual", "Ano 2026 inteiro"
   - Botao "Consultar"

3. **Query separada**: Quando o periodo esta ativo, uma query adicional busca `company_events` no range selecionado (independente do mes do calendario). Os resultados alimentam os `MonthSummaryCards` com os dados do periodo.

4. **Indicador visual**: Quando o filtro de periodo esta ativo, exibe um badge com o range (ex: "01/01 - 30/06/2026") e um botao "X" para limpar e voltar ao resumo mensal.

5. **Barra de ocupacao**: No modo periodo, a barra de ocupacao calcula com base no total de dias do range em vez de um unico mes.

6. **Faturamento total**: Adicionar uma linha extra nos cards mostrando o valor total (`total_value`) do periodo selecionado.

### Arquivos modificados

- **`src/pages/Agenda.tsx`** -- Adicionar estado para `periodRange` (null | {from, to}), query adicional para buscar eventos do periodo, e logica para alternar entre visao mensal e visao por periodo nos cards.

- **`src/components/agenda/MonthSummaryCards.tsx`** -- Aceitar prop opcional `periodLabel` (string) para exibir o badge do periodo ativo, e prop `totalDaysOverride` (number) para o calculo correto de ocupacao quando em modo periodo. Adicionar card de faturamento total.

- **`src/components/agenda/PeriodFilterPopover.tsx`** (novo) -- Componente com dois date pickers e presets, retorna `{from: Date, to: Date}` ao confirmar.

### Detalhe tecnico

```text
Agenda.tsx:
  periodRange: { from: Date; to: Date } | null = null

  SE periodRange != null:
    query = SELECT * FROM company_events
            WHERE company_id = X
            AND event_date >= periodRange.from
            AND event_date <= periodRange.to
    passar esses eventos para MonthSummaryCards
    totalDays = differenceInDays(to, from) + 1
  SENAO:
    manter fluxo atual (filteredEvents do mes)

MonthSummaryCards:
  props adicionais:
    periodLabel?: string  // ex: "01/03 - 30/06/2026"
    totalDaysOverride?: number  // para ocupacao correta no periodo
  SE periodLabel presente:
    exibir badge com o label + botao limpar
    usar totalDaysOverride no calculo de ocupacao

PeriodFilterPopover (novo):
  - Popover com Calendar mode="range"
  - Presets como botoes
  - onConfirm({ from, to })
```

### Resultado
- O buffet pode consultar "quantas festas tenho de marco a dezembro" com um clique
- Os KPIs (total, confirmadas, pendentes, canceladas, ocupacao, faturamento) se adaptam ao periodo
- O calendario continua funcionando normalmente no mes atual
- Ao limpar o filtro, volta ao resumo mensal padrao
