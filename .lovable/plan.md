
# CELEBREI 2.0 -- Reestruturacao Visual Premium

Reformulacao visual completa do sistema para padrao SaaS premium. Nenhuma funcionalidade, rota ou logica sera alterada. Apenas design, hierarquia visual, profundidade e contraste.

---

## Fase 1: Design System Global (CSS Variables + Tailwind)

**Arquivo: `src/index.css`**

- Alterar `--background` para equivalente HSL de `#F6F7FB` (230 25% 98%)
- Manter `--card` em branco puro (0 0% 100%)
- Alterar `--border` para equivalente de `#E6E8F0` (228 24% 92%)
- Atualizar `--shadow-card` para `0px 6px 18px rgba(0,0,0,0.05)`
- Adicionar nova variavel `--shadow-card-hover` com elevacao maior para micro-interacoes
- Atualizar `--radius` de `1rem` para `0.75rem` (12px)
- Atualizar gradiente da sidebar: `--gradient-sidebar` para usar `#0F172A` para `#111827`
- Atualizar variaveis de sidebar-background para HSL equivalente de `#0F172A`

**Arquivo: `tailwind.config.ts`**

- Nenhuma mudanca estrutural, as alteracoes de CSS variables propagam automaticamente

---

## Fase 2: Sidebar Premium (Admin + Hub)

**Arquivos: `src/components/admin/AdminSidebar.tsx`, `src/components/hub/HubSidebar.tsx`**

- Aumentar icones de `h-5 w-5` para `h-[22px] w-[22px]`
- Aumentar gap vertical entre itens do menu
- Adicionar ao item ativo: borda lateral esquerda de 4px com cor primaria (`border-l-4 border-sidebar-primary`), fundo mais claro (`bg-sidebar-accent/80`), font-semibold
- Adicionar hover com transicao suave (`hover:translate-x-0.5 transition-transform`)

**Arquivo: `src/components/ui/sidebar.tsx`** (linha 209)

- Atualizar gradiente do container da sidebar para usar as novas cores (`from-[#0F172A] to-[#111827]`)

---

## Fase 3: Hierarquia de Titulos

**Arquivos afetados: `src/pages/Inteligencia.tsx`, `src/pages/Formularios.tsx`, `src/pages/CentralAtendimento.tsx`, `src/pages/Agenda.tsx`**

- Aumentar titulo principal para `text-2xl font-bold` (era `text-lg font-semibold`)
- Adicionar subtitulo descritivo em `text-sm text-muted-foreground` abaixo do titulo
- Aumentar espacamento inferior do bloco de titulo (`mb-6` ao inves de `mb-3`)

---

## Fase 4: Cards de Metricas Premium

**Arquivo: `src/components/admin/MetricsCards.tsx`**

- Aumentar padding dos cards de `p-3` para `p-4`
- Numero principal de `text-xl` para `text-2xl`
- Icone de `w-3.5 h-3.5` para `w-5 h-5`, container de `p-1.5` para `p-2.5`
- Label de `text-[11px]` para `text-xs`
- Hover com `hover:-translate-y-1` alem do scale existente
- Gap do grid de `gap-2` para `gap-3`

**Arquivo: `src/components/inteligencia/ResumoDiarioTab.tsx`** (MetricCard interno)

- Aumentar padding de `p-4` para `p-5`
- Numero de `text-2xl` para `text-3xl`
- Icone container de `p-2` para `p-3`, icone de `h-5 w-5` para `h-6 w-6`

---

## Fase 5: Insight da IA como Protagonista

**Arquivo: `src/components/inteligencia/InlineAISummary.tsx`**

- Fundo do container expandido: `bg-blue-50/60 border-blue-200/50` (ao inves de `bg-muted/30`)
- Icone Brain maior: `h-5 w-5` (era `h-3.5 w-3.5`)
- Padding interno de `p-3` para `p-5`
- Botao "Gerar Resumo" com variante `default` e tamanho maior
- Sombra suave no container: `shadow-sm`

**Arquivo: `src/components/inteligencia/ResumoDiarioTab.tsx`** (secao de AI Summary)

- Card de insight com fundo `bg-blue-50/50 border-blue-100`
- Titulo da secao com icone maior e espacamento generoso

---

## Fase 6: CRM / Central de Atendimento

**Arquivo: `src/components/admin/LeadsTable.tsx`**

- Adicionar `hover:bg-muted/40` nas linhas da tabela
- Melhorar contraste dos badges de status com cores mais saturadas
- Separacao mais clara entre colunas

**Arquivo: `src/components/admin/KanbanCard.tsx`**

- Aumentar sombra dos cards para `shadow-card`
- Hover com `hover:-translate-y-0.5 hover:shadow-md`

**Arquivo: `src/components/admin/LeadsKanban.tsx`**

- Fundo das colunas com `bg-muted/30` para diferenciar do fundo geral
- Headers de coluna com mais contraste

---

## Fase 7: Operacoes (Formularios / Pacotes / Freelancer)

**Arquivos: Componentes dentro de `src/components/agenda/` e `src/components/admin/PackagesManager.tsx`, `src/components/freelancer/`**

- Cards com padding aumentado (`p-5` ao inves de `p-3/p-4`)
- Icones ilustrativos maiores nos headers (`h-6 w-6`)
- Gap do grid de `gap-3` para `gap-4`
- Sombra padrao `shadow-card` em todos os cards de conteudo

---

## Fase 8: Agenda / Calendario

**Arquivo: `src/components/agenda/AgendaCalendar.tsx`**

- Dia atual: `bg-primary text-primary-foreground font-bold` com ring sutil
- Hover nas celulas: `hover:bg-muted/50`
- Status dots maiores em desktop: `lg:h-3 lg:w-3`

**Arquivo: `src/components/agenda/MonthSummaryCards.tsx`**

- Aplicar mesmo padrao de sombra e hover dos MetricsCards

---

## Fase 9: Componente Card Global

**Arquivo: `src/components/ui/card.tsx`**

- Atualizar classe base do Card de `shadow-sm` para usar a nova shadow-card (`shadow-[0px_6px_18px_rgba(0,0,0,0.05)]`)
- Adicionar `transition-shadow duration-200` para micro-interacoes globais
- Border usa `border-[#E6E8F0]` (ja controlado via variavel CSS)

---

## Resumo de Arquivos Modificados

| # | Arquivo | Tipo de Mudanca |
|---|---------|----------------|
| 1 | `src/index.css` | Variaveis CSS (fundo, borda, sombra, radius, sidebar) |
| 2 | `src/components/ui/card.tsx` | Sombra e transicao global |
| 3 | `src/components/ui/sidebar.tsx` | Gradiente sidebar |
| 4 | `src/components/admin/AdminSidebar.tsx` | Icones, item ativo, hover |
| 5 | `src/components/hub/HubSidebar.tsx` | Icones, item ativo, hover |
| 6 | `src/components/admin/MetricsCards.tsx` | Tamanhos, sombras, hover |
| 7 | `src/components/inteligencia/ResumoDiarioTab.tsx` | MetricCard e AI section |
| 8 | `src/components/inteligencia/InlineAISummary.tsx` | Fundo azul, icones maiores |
| 9 | `src/components/admin/LeadsTable.tsx` | Hover linhas, status |
| 10 | `src/components/admin/KanbanCard.tsx` | Sombra e hover |
| 11 | `src/components/admin/LeadsKanban.tsx` | Fundo colunas |
| 12 | `src/components/agenda/AgendaCalendar.tsx` | Dia atual, hover, dots |
| 13 | `src/components/agenda/MonthSummaryCards.tsx` | Sombra e hover |
| 14 | `src/pages/Inteligencia.tsx` | Titulo maior |
| 15 | `src/pages/CentralAtendimento.tsx` | Titulo maior |
| 16 | `src/pages/Formularios.tsx` | Titulo maior |

Todas as mudancas sao exclusivamente visuais. Zero impacto em funcionalidades, rotas ou logica de negocio.
