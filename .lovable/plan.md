

## Checklist de Tarefas por Evento na Agenda

### Onde fica o checklist?

1. **No detalhe do evento (EventDetailSheet)**: Ao abrir uma festa, aparece uma secao "Checklist" com as tarefas e seus status (feito/pendente). O usuario marca/desmarca direto ali.

2. **No formulario de evento (EventFormDialog)**: Ao criar ou editar uma festa, o usuario pode adicionar/remover itens do checklist. Tambem pode escolher um "template padrao" para preencher automaticamente.

3. **Indicador visual no calendario**: Festas com tarefas pendentes mostram um pequeno indicador (ex: "3/7 tarefas") no card do dia.

### Como funciona na pratica?

```text
+------------------------------------------------------+
|  Detalhe da Festa: Aniversario Maria                  |
|------------------------------------------------------|
|  Status: Confirmado     Data: 15/03/2026             |
|  Horario: 14:00 - 18:00                              |
|  ...                                                  |
|------------------------------------------------------|
|  Checklist (4/6 concluidas)                           |
|  [x] Contrato assinado                                |
|  [x] Sinal pago                                       |
|  [x] Decoracao confirmada                             |
|  [x] Bolo encomendado                                 |
|  [ ] Buffet confirmado                                |
|  [ ] Baloes entregues                                 |
|                                                       |
|  + Adicionar tarefa                                   |
+------------------------------------------------------+
```

### Configuracao de Templates

Na pagina de **Configuracoes** da empresa, o admin pode criar templates de checklist padrao (ex: "Checklist Festa Infantil", "Checklist Casamento"). Ao criar uma festa, o usuario escolhe um template e os itens sao pre-preenchidos.

### Estrutura Tecnica

**Nova tabela: `event_checklist_items`**

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | PK |
| event_id | uuid | FK para company_events |
| company_id | uuid | Isolamento multi-tenant |
| title | text | Nome da tarefa |
| is_completed | boolean | Feito ou pendente |
| completed_at | timestamptz | Quando foi marcado |
| completed_by | uuid | Quem marcou |
| sort_order | integer | Ordem de exibicao |
| created_at | timestamptz | Criacao |

**Nova tabela: `event_checklist_templates`**

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | PK |
| company_id | uuid | Isolamento multi-tenant |
| name | text | Nome do template (ex: "Festa Infantil") |
| items | jsonb | Array de strings com os itens padrao |
| is_active | boolean | Ativo/inativo |
| created_at | timestamptz | Criacao |

**RLS**: Mesmas politicas das outras tabelas da empresa (usuarios veem/editam dados da propria empresa).

### Alteracoes nos Componentes

1. **`EventDetailSheet.tsx`**: Adicionar secao de checklist com checkboxes interativos. Marcar/desmarcar salva direto no banco. Botao "+ Adicionar tarefa" para itens avulsos.

2. **`EventFormDialog.tsx`**: Adicionar seletor de template de checklist ao criar evento. Os itens do template sao inseridos automaticamente apos salvar o evento.

3. **`AgendaCalendar.tsx`** e cards do dia: Mostrar indicador de progresso (ex: "4/6") quando houver checklist.

4. **Configuracoes (nova secao)**: Tela para gerenciar templates de checklist (CRUD simples).

### Fluxo do Usuario

1. Admin configura templates em Configuracoes (opcional)
2. Ao criar uma festa, escolhe um template ou cria do zero
3. No dia a dia, abre o detalhe da festa e vai marcando as tarefas concluidas
4. No calendario, ve rapidamente quais festas tem pendencias

