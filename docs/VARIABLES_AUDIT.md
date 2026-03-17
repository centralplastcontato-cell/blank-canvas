# AUDITORIA COMPLETA DE VARIÁVEIS — PLATAFORMA CELEBREI

> **Última atualização:** 2026-03-17  
> **Objetivo:** Mapear e documentar todas as variáveis dinâmicas utilizadas no sistema.  
> **Status:** Somente leitura — nenhuma alteração foi feita no sistema.

---

## 1 — LISTA COMPLETA DE VARIÁVEIS EXISTENTES

### Variáveis de Lead / Cliente

| Variável | Origem (tabela.coluna) | Descrição |
|---|---|---|
| `{nome}` | `campaign_leads.name` / `wapi_conversations.bot_data.nome` | Nome completo do lead |
| `{primeiro_nome}` | Derivado de `campaign_leads.name` (split no espaço) | Primeiro nome do lead |
| `{{nome}}` | Mesmo que `{nome}`, formato double-brace | Nome completo (formato alternativo) |
| `{{primeiro_nome}}` | Derivado de `campaign_leads.name` | Primeiro nome (formato alternativo) |
| `{customer_name}` | `wapi_conversations.bot_data.customer_name` | Nome do cliente (fluxo LP Bot) |
| `{telefone}` | `campaign_leads.whatsapp` | Telefone/WhatsApp do lead |

### Variáveis de Evento / Festa

| Variável | Origem (tabela.coluna) | Descrição |
|---|---|---|
| `{mes}` | `campaign_leads.month` / `bot_data.mes` | Mês da festa |
| `{{mes_festa}}` | Derivado de `campaign_leads.month` (convertido para nome do mês) | Mês da festa por extenso |
| `{dia}` | `bot_data.dia` | Dia preferido para a festa |
| `{convidados}` | `campaign_leads.guests` / `bot_data.convidados` | Número de convidados |
| `{event_date}` | `bot_data.event_date` | Data do evento (fluxo LP Bot) |
| `{guest_count}` | `bot_data.guest_count` | Quantidade de convidados (fluxo LP Bot) |
| `{child_name}` | `bot_data.child_name` | Nome da criança (fluxo LP Bot) |
| `{child_age}` | `bot_data.child_age` | Idade da criança (fluxo LP Bot) |

### Variáveis de Empresa / Buffet

| Variável | Origem (tabela.coluna) | Descrição |
|---|---|---|
| `{empresa}` | `companies.name` | Nome da empresa/buffet |
| `{buffet}` | `companies.name` | Nome do buffet (alias) |
| `{nome_buffet}` / `{{nome_buffet}}` | `companies.name` | Nome do buffet (confirmação de visita) |
| `{nome-empresa}` | `companies.name` | Nome da empresa (formato com hífen) |
| `{company}` | `companies.name` | Nome da empresa (inglês) |

### Variáveis de Unidade

| Variável | Origem (tabela.coluna) | Descrição |
|---|---|---|
| `{unidade}` | `campaign_leads.unit` / `company_units.name` | Nome da unidade do buffet |

### Variáveis de Visita

| Variável | Origem (tabela.coluna) | Descrição |
|---|---|---|
| `{{data_visita}}` | `lead_visits.data_visita` | Data da visita (formato DD/MM/YYYY) |
| `{{hora_visita}}` | `lead_visits.horario_visita` | Horário da visita |

### Variáveis de Campanha

| Variável | Origem (tabela.coluna) | Descrição |
|---|---|---|
| `{campanha}` | `campaign_leads.campaign_name` | Nome da campanha de origem |

### Variáveis de Freelancer / Escala

| Variável | Origem (tabela.coluna) | Descrição |
|---|---|---|
| `{titulo}` | Input do usuário (título da escala) | Título da escala ou atribuição |
| `{periodo}` | Input do usuário (período da escala) | Período da escala (ex: "01/03 a 15/03") |
| `{lista_escalados}` | Gerado automaticamente (lista de freelancers) | Lista formatada dos freelancers escalados |
| `{observacoes}` | Input do usuário | Observações adicionais |
| `{link}` | URL gerada automaticamente | Link para o freelancer informar disponibilidade |
| `{qtd_festas}` | Contagem de festas na escala | Quantidade de festas disponíveis |

---

## 2 — MAPA DE UTILIZAÇÃO DAS VARIÁVEIS

### `{nome}` / `{{nome}}` / `{primeiro_nome}` / `{{primeiro_nome}}`
Utilizada em:
- **Bot de qualificação** (`wapi-webhook/index.ts` → `replaceVariables`)
- **Follow-up automático** (`follow-up-check/index.ts` → replace inline + `replaceVars`)
- **Reativação de leads** (`reactivation-engine/index.ts` → `interpolateMessage`)
- **Confirmação de visita** (`visit-confirmation/index.ts` → `interpolateMessage`)
- **Recovery bot** (`follow-up-check/index.ts` → `recoveryReplaceVariables`)
- **Chat WhatsApp manual** (`WhatsAppChat.tsx` → replace inline)
- **Mensagens de automação** (`AutomationsSection.tsx` → templates padrão)
- **Envio de orçamento PDF** (`wapi-webhook/index.ts` → replace inline)

### `{empresa}` / `{buffet}` / `{nome_buffet}` / `{{nome_buffet}}`
Utilizada em:
- **Bot de qualificação** (`wapi-webhook/index.ts` → `replaceVariables`)
- **Follow-up automático** (`follow-up-check/index.ts` → replace inline)
- **Confirmação de visita** (`visit-confirmation/index.ts` → `interpolateMessage`)
- **Template LP Bot** (`LPBotSection.tsx` → template de boas-vindas)
- **Chat WhatsApp manual** (`WhatsAppChat.tsx` → replace inline)
- **Automações** (`AutomationsSection.tsx` → welcome_message)

### `{mes}` / `{{mes_festa}}`
Utilizada em:
- **Bot de qualificação** (`wapi-webhook/index.ts` → `replaceVariables`)
- **Follow-up automático** (`follow-up-check/index.ts` → replace inline)
- **Reativação de leads** (`reactivation-engine/index.ts` → `interpolateMessage`)
- **Mensagem de conclusão** (template padrão do bot)

### `{convidados}` / `{guest_count}`
Utilizada em:
- **Bot de qualificação** (`wapi-webhook/index.ts` → `replaceVariables`)
- **Follow-up automático** (`follow-up-check/index.ts` → replace inline + `replaceVars`)
- **Template LP Bot** (`LPBotSection.tsx`)
- **Envio de orçamento PDF** (`wapi-webhook/index.ts`)

### `{unidade}`
Utilizada em:
- **Bot de qualificação** (`wapi-webhook/index.ts` → `replaceVariables`)
- **Follow-up automático** (`follow-up-check/index.ts` → replace inline)
- **Legendas de mídia** (`wapi-webhook/index.ts` → captions de fotos/vídeos)
- **Template LP Bot** (`LPBotSection.tsx`)
- **Chat WhatsApp manual** (`WhatsAppChat.tsx`)

### `{dia}`
Utilizada em:
- **Bot de qualificação** (`wapi-webhook/index.ts` → mensagem de conclusão)
- **Recovery bot** (`follow-up-check/index.ts` → mensagem de conclusão)

### `{{data_visita}}` / `{{hora_visita}}`
Utilizada em:
- **Confirmação de visita** (`visit-confirmation/index.ts` → `interpolateMessage`)
- **UI de configuração** (`VisitConfirmationSection.tsx`)

### `{customer_name}` / `{event_date}` / `{child_name}` / `{child_age}`
Utilizada em:
- **Follow-up LP Bot** (`follow-up-check/index.ts` → `replaceVars`)

### `{titulo}` / `{periodo}` / `{lista_escalados}` / `{observacoes}` / `{link}` / `{qtd_festas}`
Utilizada em:
- **Envio de escala para grupos WhatsApp** (`ScheduleGroupMessageCard.tsx` → template)
- **Envio de escalados para grupos WhatsApp** (`AssignmentGroupMessageCard.tsx` → template)
- **Diálogos de envio** (`SendScheduleToGroupsDialog.tsx`, `SendAssignmentsToGroupsDialog.tsx`)

---

## 3 — AGRUPAMENTO POR ENTIDADE

### 🧑 Variáveis de Lead

| Variável | Formato(s) | Funções de interpolação |
|---|---|---|
| nome | `{nome}`, `{{nome}}` | `replaceVariables`, `recoveryReplaceVariables`, `interpolateMessage`, inline replace |
| primeiro_nome | `{primeiro_nome}`, `{{primeiro_nome}}` | `interpolateMessage` (reativação) |
| customer_name | `{customer_name}` | `replaceVars` (follow-up LP Bot) |
| telefone | `{telefone}` | Uso indireto |

### 🎉 Variáveis de Evento / Festa

| Variável | Formato(s) | Funções de interpolação |
|---|---|---|
| mes | `{mes}`, `{{mes_festa}}` | `replaceVariables`, `interpolateMessage`, inline |
| dia | `{dia}` | `replaceVariables`, `recoveryReplaceVariables` |
| convidados | `{convidados}`, `{guest_count}` | `replaceVariables`, `replaceVars`, inline |
| event_date | `{event_date}` | `replaceVars` |
| child_name | `{child_name}` | `replaceVars` |
| child_age | `{child_age}` | `replaceVars` |

### 🏢 Variáveis de Empresa

| Variável | Formato(s) | Funções de interpolação |
|---|---|---|
| empresa | `{empresa}`, `{{empresa}}` | `replaceVariables`, `recoveryReplaceVariables`, inline |
| nome_buffet | `{nome_buffet}`, `{{nome_buffet}}` | `interpolateMessage` (visit-confirmation) |
| buffet / company | `{buffet}`, `{company}` | Aliases raramente usados |

### 📍 Variáveis de Unidade

| Variável | Formato(s) | Funções de interpolação |
|---|---|---|
| unidade | `{unidade}` | `replaceVariables`, inline replace (captions) |

### 📅 Variáveis de Visita

| Variável | Formato(s) | Funções de interpolação |
|---|---|---|
| data_visita | `{{data_visita}}` | `interpolateMessage` (visit-confirmation) |
| hora_visita | `{{hora_visita}}` | `interpolateMessage` (visit-confirmation) |

### 👷 Variáveis de Freelancer / Escala

| Variável | Formato(s) | Funções de interpolação |
|---|---|---|
| titulo | `{titulo}` | Replace inline (envio para grupos) |
| periodo | `{periodo}` | Replace inline (envio para grupos) |
| lista_escalados | `{lista_escalados}` | Gerado automaticamente |
| observacoes | `{observacoes}` | Replace inline |
| link | `{link}` | URL gerada dinamicamente |
| qtd_festas | `{qtd_festas}` | Contagem automática |

### 📊 Variáveis de Campanha

| Variável | Formato(s) | Funções de interpolação |
|---|---|---|
| campanha | `{campanha}` | `replaceVariables` |

---

## 4 — FUNÇÕES DE INTERPOLAÇÃO

O sistema possui **4 funções distintas** de interpolação de variáveis:

| Função | Arquivo | Formato suportado | Contexto |
|---|---|---|---|
| `replaceVariables` | `wapi-webhook/index.ts` | `{var}` e `{{var}}` | Bot de qualificação principal |
| `recoveryReplaceVariables` | `follow-up-check/index.ts` | `{var}` e `{{var}}` | Recovery bot / follow-up |
| `interpolateMessage` | `visit-confirmation/index.ts` | `{{var}}` | Confirmação de visita |
| `interpolateMessage` | `reactivation-engine/index.ts` | `{{var}}` | Reativação de leads |
| `replaceVars` (inline) | `follow-up-check/index.ts` | `{var}` | Follow-up LP Bot |
| Replace inline | Diversos arquivos | `{var}` | Captions, PDFs, chat manual |

---

## 5 — OBSERVAÇÕES E INCONSISTÊNCIAS

### ⚠️ Formato duplo
O sistema aceita tanto `{variavel}` (single brace) quanto `{{variavel}}` (double brace). Não há padronização única — cada módulo usa o formato que preferir.

### ⚠️ Variáveis documentadas na UI sem resolução backend
As variáveis `{hora}` e `{data}` aparecem documentadas em `MessagesSection.tsx` como variáveis disponíveis para mensagens do bot, porém **não possuem resolução** nos engines de follow-up e reativação.

### ⚠️ Aliases redundantes
- `{empresa}`, `{buffet}`, `{nome_buffet}`, `{nome-empresa}`, `{company}` → todos resolvem para `companies.name`
- `{convidados}` e `{guest_count}` → mesmo dado, nomes diferentes por contexto (bot padrão vs LP Bot)

### ⚠️ Funções duplicadas
Existem **duas implementações independentes** de `interpolateMessage` (visit-confirmation e reactivation-engine) com lógica idêntica. Candidatas a refatoração futura.

---

## 6 — ARQUIVOS RELEVANTES

| Arquivo | Papel |
|---|---|
| `supabase/functions/wapi-webhook/index.ts` | Bot principal — `replaceVariables` |
| `supabase/functions/follow-up-check/index.ts` | Follow-up + Recovery — `recoveryReplaceVariables` + `replaceVars` |
| `supabase/functions/reactivation-engine/index.ts` | Reativação — `interpolateMessage` |
| `supabase/functions/visit-confirmation/index.ts` | Confirmação de visita — `interpolateMessage` |
| `src/components/whatsapp/WhatsAppChat.tsx` | Chat manual — replace inline |
| `src/components/whatsapp/settings/AutomationsSection.tsx` | Config do bot — templates padrão |
| `src/components/whatsapp/settings/LPBotSection.tsx` | Config LP Bot — template welcome |
| `src/components/whatsapp/settings/ReactivationSection.tsx` | Config reativação — variáveis listadas na UI |
| `src/components/whatsapp/settings/VisitConfirmationSection.tsx` | Config confirmação visita |
| `src/components/whatsapp/settings/MessagesSection.tsx` | Config mensagens do bot |
| `src/components/whatsapp/settings/ScheduleGroupMessageCard.tsx` | Template escala para grupos |
| `src/components/whatsapp/settings/AssignmentGroupMessageCard.tsx` | Template escalados para grupos |
