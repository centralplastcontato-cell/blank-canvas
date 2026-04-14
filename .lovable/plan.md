

# Fase 3 — Automação e Inteligência nas Tarefas

## Resumo

Quatro entregas que adicionam automação, visibilidade e notificações ao módulo de tarefas, transformando-o de operacional passivo em proativo.

---

## 3.1 — Dashboard de Produtividade

**O que faz:** Nova seção na aba Tarefas com métricas visuais de desempenho.

**Métricas exibidas:**
- Tarefas concluídas nos últimos 7 e 30 dias
- Tempo médio de conclusão (diferença entre `created_at` e `completed_at`)
- Taxa de conclusão no prazo vs. atrasadas
- Gráfico de barras semanal (últimas 4 semanas)
- Ranking por responsável (quem completou mais)

**Alterações técnicas:**
- Novo componente `TaskProductivityDashboard.tsx` com Recharts
- Hook `useTaskMetrics.ts` que calcula métricas a partir das tasks já carregadas
- Integrado na `AgendaTarefasTab.tsx` como seção colapsável no topo (abaixo dos cards de resumo)
- Sem novas tabelas — tudo derivado de `company_tasks` (campos `created_at`, `completed_at`, `status`, `assigned_to`, `due_date`)

---

## 3.2 — Notificações In-App para Tarefas

**O que faz:** Gera notificações automáticas na tabela `notifications` quando tarefas estão prestes a vencer ou foram atribuídas.

**Tipos de notificação:**
- `tarefa_vencendo` — tarefa vence nas próximas 24h (ainda pendente/em andamento)
- `tarefa_atribuida` — quando `assigned_to` é alterado, notifica o novo responsável

**Alterações técnicas:**
- Nova Edge Function `task-notifications/index.ts`:
  - Consulta `company_tasks` com `due_date = amanhã` e `status != concluida`
  - Insere em `notifications` para cada membro da empresa (via `user_companies`)
  - Usa dedup por `company_id + task_id + data` para não duplicar
- Trigger SQL em `company_tasks` para `tarefa_atribuida`:
  - `AFTER UPDATE` quando `assigned_to` muda, insere notification para o novo responsável
- Registrar função em `supabase/config.toml`
- `AlertsPanel.tsx` e `NotificationBell.tsx` já renderizam tipos desconhecidos — só precisa adicionar ícone/ação para os novos tipos

**Cron:** Configuração manual no SQL Editor para rodar `task-notifications` diariamente às 8h.

---

## 3.3 — Tarefas Automáticas por Evento

**O que faz:** Ao criar um evento, gera automaticamente tarefas padrão baseadas em templates da empresa.

**Fluxo:**
1. Empresa configura um "template de tarefas por evento" (reusa conceito do `event_checklist_templates` já existente)
2. Ao criar evento, se houver template ativo, cria `company_tasks` vinculadas ao `event_id`
3. Tarefas geradas com datas relativas (ex: "3 dias antes do evento", "no dia do evento")

**Alterações técnicas:**
- Nova tabela `event_task_templates` (ou campo adicional na `event_checklist_templates`):
  - `id`, `company_id`, `name`, `is_active`
  - `items`: JSON array com `{ title, category, priority, days_before_event }`
- Na página `Agenda.tsx`, após criar evento com sucesso, consultar templates ativos e inserir tasks automaticamente
- Opcional: checkbox no formulário de evento "Gerar tarefas automáticas"
- Cada tarefa gerada recebe `event_id` do evento criado e `due_date` calculada

**Migration SQL:** Criar tabela `event_task_templates` + RLS policies.

---

## 3.4 — Cron Job para Tarefas Recorrentes

**O que faz:** Gera automaticamente instâncias futuras de tarefas recorrentes no backend, substituindo a expansão frontend atual.

**Lógica:**
1. Edge Function `generate-recurring-tasks/index.ts` roda diariamente
2. Busca tarefas com `is_recurring = true` e verifica a última instância gerada
3. Gera próximas ocorrências (até 7 dias à frente) como novos registros em `company_tasks` com `parent_task_id` apontando para a tarefa mãe
4. Respeita `recurrence_end_date` (para de gerar se ultrapassou)
5. Dedup via consulta: não gera se já existe task filha com mesma `due_date`

**Alterações técnicas:**
- Nova Edge Function `generate-recurring-tasks/index.ts`
- Registrar em `supabase/config.toml` com `verify_jwt = false`
- Cron configurado manualmente no SQL Editor (diário, 6h da manhã)
- Lógica de cálculo:
  - `diaria`: gera para cada dia nos próximos 7 dias
  - `semanal`: gera para dias da semana selecionados (`recurrence_days`)
  - `mensal`: gera para o próximo mês se ainda não existe
- Frontend (`AgendaTudoTab.tsx`): simplificar `expandedTaskDates` — com o cron gerando instâncias reais, a expansão frontend se torna fallback

---

## Sequência de Implementação

| Ordem | Item | Complexidade | Dependências |
|---|---|---|---|
| 1 | 3.1 Dashboard | Baixa | Nenhuma — só frontend |
| 2 | 3.4 Cron recorrentes | Média | Nenhuma — backend isolado |
| 3 | 3.2 Notificações | Média | Cron manual no SQL Editor |
| 4 | 3.3 Tarefas por evento | Média | Migration nova tabela |

## O que NÃO entra na Fase 3

- Tags customizáveis (Fase 4)
- Notificações push/PWA (Fase 4)
- Kanban/drag-and-drop de tarefas (fora de escopo — mantemos simplicidade)
- Subtarefas aninhadas (complexidade desnecessária para o público-alvo)

