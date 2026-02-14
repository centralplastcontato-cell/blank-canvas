

## Filtro de Timeline: Todos os Eventos vs Apenas Alertas

### Problema atual

A timeline mistura eventos normais (proximo passo, status change, etc.) com alertas automaticos (alerta reminded 2h), gerando uma lista muito longa e poluida -- como mostrado no screenshot com 49 eventos, muitos sendo alertas repetitivos.

### Solucao

Adicionar um toggle/segmented control dentro do card "Timeline do Dia" com duas opcoes:

- **Tudo** -- mostra todos os eventos (comportamento atual)
- **Alertas** -- filtra apenas eventos de alerta (ex: `alerta_reminded_2h`, `bot_invalid_reply`, e outros tipos de alerta)

O usuario escolhe qual visualizacao prefere, mantendo a interface limpa.

### Detalhes tecnicos

**Arquivo: `src/components/inteligencia/ResumoDiarioTab.tsx`**

- Adicionar estado local `timelineFilter` com valores `"all"` | `"alerts"` dentro do componente `TimelineSection`
- Criar um pequeno `TabsList` (ou botoes segmentados) no header do card Timeline, ao lado do titulo
- Filtrar o array `events` antes de renderizar:
  - `"all"`: mostra tudo (sem filtro)
  - `"alerts"`: filtra apenas eventos onde `action` contem `alerta`, `bot_invalid_reply`, `follow`, ou outros tipos de alerta
- Atualizar o contador de eventos para refletir a quantidade filtrada
- Manter o icone e formatacao existentes para cada tipo de evento

Nenhuma alteracao no backend ou no banco de dados e necessaria -- e apenas um filtro visual no frontend.

