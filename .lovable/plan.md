
# Painel de Tickets de Suporte no Hub + Notificacoes

## Problema
Hoje os tickets sao criados pelo chatbot mas ninguem e avisado e nao existe nenhuma tela para visualizar ou gerenciar esses tickets.

## Solucao

### 1. Nova pagina `/hub/suporte` - Gerenciador de Tickets

Pagina no Hub seguindo o mesmo padrao do `HubAIUsage.tsx` (usa `HubLayout`, cards de metricas, tabela, filtros).

**O que mostra:**
- Cards de resumo: Total de tickets, Abertos, Em andamento, Resolvidos
- Filtros: por status (novo, em_andamento, resolvido, fechado), por categoria (duvida, bug, sugestao), por empresa, por prioridade
- Tabela com todos os tickets: assunto, empresa, usuario, categoria, prioridade, status, data
- Ao clicar num ticket: abre um Sheet lateral com todos os detalhes (descricao, historico da conversa com a IA, erros do console, pagina onde ocorreu, dados de contexto)
- Botoes para mudar status (ex: "Marcar como em andamento", "Resolver", "Fechar")
- Badge colorido por categoria: bug (vermelho), sugestao (azul), duvida (amarelo)

### 2. Notificacao automatica quando ticket e criado

Criar um **trigger no banco** na tabela `support_tickets` que, ao inserir um novo ticket, cria uma notificacao para todos os admins globais (is_admin) na tabela `notifications`.

- Tipo: `new_support_ticket`
- Titulo: "Novo ticket de suporte" + emoji por categoria
- Mensagem: nome do usuario + assunto do ticket
- Data: `{ ticket_id, category, priority, company_name }`

Assim o Victor (e voce) recebem o alerta no sino de notificacoes em tempo real, com som e tudo, usando o sistema que ja existe.

### 3. Adicionar no menu do Hub

Adicionar item "Suporte" no `HubSidebar.tsx` com icone `Headset` (do lucide-react), apontando para `/hub/suporte`.

### 4. Rota no App.tsx

Adicionar `<Route path="/hub/suporte" element={<HubSuporte />} />`.

---

## Detalhes Tecnicos

### Arquivos a criar
| Arquivo | Descricao |
|---------|-----------|
| `src/pages/HubSuporte.tsx` | Pagina principal de gerenciamento de tickets |

### Arquivos a modificar
| Arquivo | Mudanca |
|---------|---------|
| `src/components/hub/HubSidebar.tsx` | Adicionar item "Suporte" no menu |
| `src/App.tsx` | Adicionar rota `/hub/suporte` |
| `src/components/admin/NotificationBell.tsx` | Adicionar icone para tipo `new_support_ticket` |

### Migration SQL
- Trigger `fn_notify_new_support_ticket()` na tabela `support_tickets` (INSERT)
- Busca admins globais via `is_admin()` e insere notificacao para cada um
- Inclui categoria, prioridade e nome da empresa na notificacao

### Funcionalidades da pagina
- Listagem com paginacao (ultimos 100 tickets)
- Filtro por status, categoria, empresa e prioridade
- Sheet lateral com detalhes completos do ticket (incluindo conversa IA e erros do console)
- Acoes: alterar status do ticket diretamente
- Realtime: subscribe a novos tickets para atualizar a lista automaticamente
- Cards de metricas no topo (total, abertos, por categoria)
