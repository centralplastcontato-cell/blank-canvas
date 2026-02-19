
# Elevacao Premium Global - Plano de Execucao

## Resumo

Transformar o CELEBREI de "sistema organizado" para "SaaS premium internacional" atraves de 6 etapas focadas em contraste, profundidade, hierarquia e micro-interacoes. **Zero mudancas funcionais** - apenas classes CSS e estilos.

**Total: 14 arquivos alterados, somente estilos.**

---

## ETAPA 1: Fundacao Visual (Tokens CSS + Tailwind)

**Arquivos:** `src/index.css` + `tailwind.config.ts`

Mudancas em `src/index.css`:
- `--background`: de `228 25% 95.5%` para `228 25% 93%` (mais contraste fundo vs card)
- `--shadow-card`: aumentar opacidade para sombra mais perceptivel
- `--shadow-card-hover`: sombra hover mais definida
- Nova variavel `--shadow-premium` para cards de destaque (metricas, IA)
- `--border`: reduzir luminosidade levemente para bordas mais definidas

Mudancas em `tailwind.config.ts`:
- Novo keyframe `fade-up`: translateY(8px)+opacity:0 para translateY(0)+opacity:1
- Nova animacao `animate-fade-up`

---

## ETAPA 2: Metricas com Impacto

**Arquivo:** `src/components/inteligencia/ResumoDiarioTab.tsx` (MetricCard)

Mudancas no MetricCard:
- Adicionar borda lateral esquerda colorida (3px) usando a cor do icone para diferenciacao visual imediata
- Icone: de `h-4 w-4` para `h-5 w-5`, container de `p-2` para `p-2.5 rounded-xl`
- Aplicar sombra premium no card
- Manter numeros e labels como estao (ja foram ajustados na etapa anterior)

**Arquivo:** `src/components/admin/MetricsCards.tsx` (CRM)

Mudancas:
- Numeros: de `text-2xl font-bold` para `text-3xl font-extrabold`
- Label: mover para baixo do numero com `text-[11px] uppercase tracking-wider`
- Icone: manter `w-5 h-5` no container `p-2.5 rounded-xl`
- Padronizar com o mesmo pattern do ResumoDiario

---

## ETAPA 3: Modulo Inteligencia - "Cerebro do Sistema"

**Arquivo:** `src/components/inteligencia/InlineAISummary.tsx`

- Container expandido: de `bg-blue-50/60` para `bg-gradient-to-br from-blue-50/80 to-indigo-50/50`
- Borda: de `border-blue-200/50` para `border-primary/20`
- Adicionar `shadow-card` no container
- Icone Brain: de `h-5 w-5` para `h-5 w-5` com `drop-shadow-sm` para leve glow

**Arquivo:** `src/components/inteligencia/PrioridadesTab.tsx`

- Cards de coluna: adicionar `border-l-4` colorida (verde/laranja/azul) para hierarquia forte
- LeadRow: de `p-3` para `p-4`, borda mais definida `border-border/50`
- Score: de texto normal para `font-bold`

**Arquivo:** `src/components/inteligencia/FunilTab.tsx`

- Graficos: de `h-48` para `h-56` e `h-44` para `h-52` (melhor leitura)
- Numeros do funil: de `text-sm font-semibold` para `text-base font-bold`
- Barra do funil: gradiente sutil em vez de cor solida

**Arquivo:** `src/components/inteligencia/TemperatureBadge.tsx`

- Corrigir cores para light mode: trocar `text-blue-300` para `text-blue-700`, `text-yellow-300` para `text-yellow-700`, etc.
- As cores atuais sao para fundo escuro e ficam invisiveis no tema claro

---

## ETAPA 4: CRM Kanban - Limpeza e Contraste

**Arquivo:** `src/components/admin/KanbanCard.tsx`

- Nome do lead: de `font-semibold` para `font-bold` para mais destaque
- Remover `animate-pulse` dos badges de Visita/Follow-up (manter apenas no "Retornou")
- Tags de metadata: `rounded-md` uniforme, cores mais definidas sem gradiente

**Arquivo:** `src/components/admin/LeadsKanban.tsx`

- Fundo das colunas: simplificar para `bg-muted/30` (mais limpo)
- Header de coluna: `bg-card/80` com borda inferior mais definida
- Empty state: reduzir padding, mais discreto

---

## ETAPA 5: Agenda - Calendario Sofisticado

**Arquivo:** `src/components/agenda/AgendaCalendar.tsx`

- Dia selecionado: adicionar `ring-2 ring-primary/30 ring-offset-2` para destacar mais
- Dots de eventos: de `h-1.5 w-1.5 lg:h-3 lg:w-3` para `h-2 w-2 lg:h-3 lg:w-3` (mais visiveis)
- Navegacao: botoes com `hover:bg-primary/10` para melhor feedback
- Dias com evento: fundo sutil `bg-primary/5` (via DayContent)

---

## ETAPA 6: Micro-Interacoes e Hover

**Arquivo:** `src/components/ui/card.tsx`

- Transicao: de `duration-200` para `duration-300 ease-out` (mais suave)

**Arquivo:** `src/pages/Inteligencia.tsx`

- Adicionar classe `animate-fade-up` nos TabsContent para transicao suave ao trocar abas

**Arquivo:** `src/components/ui/badge.tsx`

- Adicionar `transition-colors duration-200` ao base do badge para hover mais fluido

---

## Resumo de Impacto

| Etapa | Arquivos | Tipo |
|-------|----------|------|
| 1. Fundacao | `index.css`, `tailwind.config.ts` | Tokens CSS |
| 2. Metricas | `ResumoDiarioTab.tsx`, `MetricsCards.tsx` | Classes CSS |
| 3. Inteligencia | `InlineAISummary.tsx`, `PrioridadesTab.tsx`, `FunilTab.tsx`, `TemperatureBadge.tsx` | Classes CSS |
| 4. Kanban | `KanbanCard.tsx`, `LeadsKanban.tsx` | Classes CSS |
| 5. Agenda | `AgendaCalendar.tsx` | Classes CSS |
| 6. Micro-interacoes | `card.tsx`, `Inteligencia.tsx`, `badge.tsx` | Classes CSS |

**14 arquivos, 0 mudancas funcionais, 0 componentes novos.**

Cada etapa sera executada sequencialmente para garantir que nada quebre.
