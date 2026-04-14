

# Fase 1 — Evolução Inicial da Agenda de Tarefas

## O que existe hoje

- Tarefas têm status binário: **Pendente** ou **Concluída**
- Filtros por categoria e status (pendente/concluída)
- Cards de resumo: Pendentes, Concluídas, Atrasadas
- A aba "Tudo" já unifica festas, visitas e tarefas no calendário

## O que a Fase 1 vai adicionar (3 entregas)

### 1. Novo status "Em andamento"

**Hoje:** Uma tarefa só pode ser Pendente ou Concluída.
**Depois:** Pendente → Em andamento → Concluída (+ Atrasada automática).

- Adicionar coluna `status` na tabela `company_tasks` (valores: `pendente`, `em_andamento`, `concluida`, `atrasada`)
- Manter compatibilidade com o campo `completed` existente (derivado do status)
- O filtro de status ganha a opção "Em andamento"
- O card de resumo ganha um 4º contador: "Em andamento" (com ícone azul)
- No TaskCard, o checkbox vira um seletor de 3 estados com visual claro

### 2. Visão "Hoje" na aba Tudo

**Hoje:** A aba "Tudo" mostra o mês inteiro sem destaque para o dia atual.
**Depois:** Ao abrir a aba "Tudo", o dia atual já vem selecionado automaticamente, mostrando imediatamente festas, visitas e tarefas do dia.

- Selecionar `selectedDate = new Date()` ao montar o componente
- Adicionar um botão "Hoje" para voltar rapidamente ao dia atual quando navegando em outros dias

### 3. Tarefas atrasadas no Smart Alerts

**Hoje:** O sistema de alertas inteligentes não monitora tarefas.
**Depois:** Se houver tarefas com data vencida e não concluídas, um alerta aparece no painel de Inteligência Comercial.

- Adicionar um novo tipo de alerta `tarefas_atrasadas` na Edge Function `smart-alerts`
- Consultar `company_tasks` com `due_date < hoje` e `completed = false`
- Exibir mensagem como "Você tem X tarefas atrasadas" com botão para abrir a aba de Tarefas

---

## O que NÃO muda na Fase 1

- Não adiciona tarefas recorrentes (isso é Fase 2)
- Não vincula tarefas a eventos ou leads (isso é Fase 2/3)
- Não adiciona notificações push para tarefas (isso é Fase 3)
- Não muda o visual geral dos cards ou formulário de criação

## Resumo de alterações técnicas

| Arquivo/Recurso | Mudança |
|---|---|
| Migration SQL | Adicionar coluna `status` em `company_tasks` |
| `useTasks.ts` | Adaptar hook para usar `status` ao invés de `completed` |
| `TaskCard.tsx` | Seletor de status visual (3 estados) |
| `AgendaTarefasTab.tsx` | Novo filtro "Em andamento" + 4º card resumo |
| `AgendaTudoTab.tsx` | Auto-selecionar dia atual + botão "Hoje" |
| `smart-alerts/index.ts` | Novo alerta `tarefas_atrasadas` |
| `AlertsPanel.tsx` | Ícone + ação para o novo tipo de alerta |

