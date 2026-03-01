# Documentação Técnica Interna — Celebrei Hub

> Última atualização: Março 2026  
> Stack: React 18 · TypeScript · Vite 5 · Tailwind CSS 3 · shadcn/ui · Supabase (Edge Functions + Postgres + Storage)

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura Multi-Tenant](#2-arquitetura-multi-tenant)
3. [Estrutura de Rotas](#3-estrutura-de-rotas)
4. [Módulos Principais](#4-módulos-principais)
5. [Sistema de Permissões](#5-sistema-de-permissões)
6. [Edge Functions](#6-edge-functions)
7. [Banco de Dados](#7-banco-de-dados)
8. [Hooks Customizados](#8-hooks-customizados)
9. [Configuração do Ambiente](#9-configuração-do-ambiente)
10. [Convenções e Padrões](#10-convenções-e-padrões)

---

## 1. Visão Geral

O **Celebrei** é uma plataforma SaaS multi-tenant para gestão completa de buffets infantis. O sistema é dividido em dois portais independentes:

| Portal | Público-alvo | Domínio |
|--------|-------------|---------|
| **Hub** (Grupo Celebrei) | Gestores do grupo, onboarding de novos buffets | `hubcelebrei.com.br`, `celebrei.com.br` |
| **Painel do Buffet** | Equipe operacional e comercial de cada buffet | Domínio próprio do buffet (ex: `castelodadiversao.com.br`) |

Além disso, existem **rotas públicas** (formulários, landing pages dinâmicas, controle de festa) acessíveis sem autenticação.

### Stack Completa

```
Frontend:       React 18 + TypeScript + Vite 5
Estilização:    Tailwind CSS 3 + shadcn/ui + Framer Motion
Estado:         TanStack React Query + Context API
Roteamento:     React Router DOM v6
Backend:        Supabase (Postgres + Auth + Edge Functions + Storage + Realtime)
IA:             OpenAI API (via Edge Functions)
WhatsApp:       W-API (webhook + REST)
PDF:            jsPDF + jspdf-autotable
Drag & Drop:    @dnd-kit
```

---

## 2. Arquitetura Multi-Tenant

### Resolução de Domínio

O arquivo `src/hooks/useDomainDetection.ts` normaliza o hostname e decide qual portal renderizar:

```
hostname → getCanonicalHost() → lowercase, sem www, sem porta
                                    ↓
                            isHubDomain()?  → Hub Landing Page
                            isPreviewDomain()? → Default LP (Castelo)
                            getKnownBuffetDomain()? → LP do buffet mapeado
                            Senão → 404 (segurança)
```

**Mapeamento de domínios conhecidos** (`KNOWN_BUFFET_DOMAINS`):

```typescript
{
  "castelodadiversao.com.br": "castelodadiversao.com.br",
  "castelodadiversao.online": "castelodadiversao.com.br",  // alias
  "buffetplanetadivertido.online": "buffetplanetadivertido.online",
  "aventurakids.online": "aventurakids.online",
}
```

### RootPage.tsx — Roteador Raiz

O componente `RootPage` é renderizado na rota `/` e decide qual página exibir baseado no domínio. Isso garante que cada buffet veja apenas sua própria landing page.

### CompanyContext

O `CompanyContext` (`src/contexts/CompanyContext.tsx`) é o coração do multi-tenant:

- **`currentCompany`**: Empresa atualmente selecionada
- **`currentCompanyId`**: ID da empresa ativa (usado em todas as queries)
- **`currentRole`**: Role do usuário na empresa (`owner` | `admin` | `member`)
- **`userCompanies`**: Todas as empresas que o usuário tem acesso
- **`switchCompany()`**: Troca de empresa ativa (persiste em `localStorage`)

**Prioridade de seleção**: `localStorage` → empresa `is_default` → primeira empresa

### Isolamento de Dados

Toda query ao banco deve incluir o `company_id` da empresa ativa. O helper `supabase-helpers.ts` facilita:

```typescript
import { getCurrentCompanyId } from '@/lib/supabase-helpers';

// Insere com company_id automático
await insertWithCompany('campaign_leads', { name, whatsapp, ... });

// Em queries manuais, sempre filtrar:
.eq('company_id', companyId)
```

---

## 3. Estrutura de Rotas

### Rotas do Hub (`/hub/*`)

| Rota | Página | Descrição |
|------|--------|-----------|
| `/hub` | `HubDashboard` | Dashboard do grupo com métricas agregadas |
| `/hub/empresas` | `HubEmpresas` | Gestão de empresas filhas |
| `/hub/users` | `HubUsers` | Gestão de usuários do grupo |
| `/hub/whatsapp` | `HubWhatsApp` | WhatsApp centralizado do hub |
| `/hub/onboarding` | `HubOnboarding` | Onboarding de novos buffets |
| `/hub/prospeccao` | `HubProspeccao` | Prospecção B2B |
| `/hub/consumo-ia` | `HubAIUsage` | Consumo e custos de IA |
| `/hub/treinamento` | `HubTreinamento` | Materiais de treinamento |
| `/hub/leads` | `HubLeads` | Leads consolidados do grupo |
| `/hub/comercial-b2b` | `ComercialB2B` | CRM B2B |

### Rotas do Painel Buffet

| Rota | Página | Descrição |
|------|--------|-----------|
| `/atendimento` | `CentralAtendimento` | Central de atendimento (CRM + WhatsApp) |
| `/configuracoes` | `Configuracoes` | Configurações do buffet (WhatsApp, LP, bot, etc.) |
| `/inteligencia` | `Inteligencia` | Inteligência de leads (score, temperatura, IA) |
| `/agenda` | `Agenda` | Calendário de eventos e festas |
| `/formularios` | `Formularios` | Gestão de formulários (avaliação, contrato, cardápio) |
| `/avaliacoes` | `Avaliacoes` | Respostas de avaliações |
| `/pre-festa` | `PreFesta` | Formulários pré-festa |
| `/dashboard` | `Index` | Dashboard operacional (freelancers) |
| `/users` | `Users` | Gestão de usuários do buffet |
| `/treinamento` | `Treinamento` | Treinamento da equipe |

### Rotas Públicas (sem autenticação)

| Rota | Página | Descrição |
|------|--------|-----------|
| `/lp/:slug` | `DynamicLandingPage` | Landing page dinâmica por slug |
| `/festa/:eventId` | `PublicPartyControl` | Hub de controle de festa (links públicos) |
| `/avaliacao/:companySlug/:templateSlug` | `PublicEvaluation` | Formulário de avaliação |
| `/pre-festa/:companySlug/:templateSlug` | `PublicPreFesta` | Formulário pré-festa |
| `/contrato/:companySlug/:templateSlug` | `PublicContrato` | Formulário de contrato |
| `/cardapio/:companySlug/:templateSlug` | `PublicCardapio` | Escolha de cardápio |
| `/equipe/:recordId` | `PublicStaff` | Gestão de equipe (festa) |
| `/manutencao/:recordId` | `PublicMaintenance` | Checklist de manutenção |
| `/acompanhamento/:recordId` | `PublicPartyMonitoring` | Monitoramento da festa |
| `/lista-presenca/:recordId` | `PublicAttendance` | Lista de presença |
| `/informacoes/:recordId` | `PublicEventInfo` | Informações do evento |
| `/freelancer/:companySlug/:templateSlug` | `PublicFreelancer` | Cadastro de freelancer |
| `/escala/:companySlug/:scheduleSlug` | `PublicFreelancerSchedule` | Disponibilidade de escala |
| `/onboarding/:slug` | `Onboarding` | Onboarding público |

### Redirects de Compatibilidade

```
/admin      → /atendimento
/whatsapp   → /atendimento
/empresas   → /hub/empresas
/perfil     → /configuracoes?tab=perfil
```

---

## 4. Módulos Principais

### 4.1 CRM / Leads

**Componentes**: `LeadsKanban`, `LeadsTable`, `LeadCard`, `LeadDetailSheet`, `LeadsFilters`, `KanbanCard`

**Status do lead** (`LeadStatus`):
```
novo → em_contato → orcamento_enviado → aguardando_resposta → fechado
                                                              → perdido
Especiais: transferido, trabalhe_conosco, fornecedor, cliente_retorno, outros
```

**Funcionalidades**:
- Kanban drag-and-drop por status (usando `@dnd-kit`)
- Tabela com filtros por unidade, mês, responsável, status
- Transferência de leads entre unidades/responsáveis (`TransferLeadDialog`)
- Exportação para CSV/Excel (`exportLeads.ts`)
- Histórico de ações por lead (`LeadHistory`)
- Atribuição automática de responsável

### 4.2 WhatsApp (W-API)

**Componentes**: `WhatsAppChat`, `ConversationFilters`, `ConversationStatusActions`, `MediaMessage`, `LinkPreviewCard`, `SalesMaterialsMenu`

**Arquitetura**:
```
Usuário envia msg → W-API → POST /wapi-webhook → Supabase (wapi_messages + wapi_conversations)
                                                         ↓
                                                  Flow Builder OU Bot Legado
                                                         ↓
                                                  POST /wapi-send → W-API → WhatsApp
```

**Flow Builder Visual** (`src/components/flowbuilder/`):
- Canvas visual com nós arrastáveis (`FlowCanvas`, `FlowNodeComponent`)
- Tipos de nó: `message`, `question`, `action`, `condition`
- Edges com condições (`FlowEdgeComponent`)
- Preview de fluxo (`FlowPreviewDialog`)
- Persistência em `conversation_flows`, `flow_nodes`, `flow_edges`, `flow_node_options`
- Estado do lead no fluxo: `flow_lead_state`

**Configurações** (`src/components/whatsapp/settings/`):
- Conexão e QR Code (`ConnectionSection`)
- Mensagens automáticas (`MessagesSection`)
- Bot da LP (`LPBotSection`)
- Materiais de venda (`SalesMaterialsSection`)
- Notificações (`NotificationsSection`)
- Dados da empresa (`CompanyDataSection`)

### 4.3 Agenda

**Componentes**: `AgendaCalendar`, `AgendaListView`, `EventFormDialog`, `EventDetailSheet`, `EventChecklist`, `EventStaffManager`, `AttendanceManager`, `MaintenanceManager`, `PartyMonitoringManager`, `EventInfoManager`, `MonthSummaryCards`

**Funcionalidades**:
- Calendário mensal com eventos coloridos por unidade
- Criação de eventos vinculados a leads
- Checklists por evento (templates reutilizáveis via `ChecklistTemplateManager`)
- Gestão de equipe por evento (staff entries)
- Lista de presença pública
- Monitoramento em tempo real da festa
- Envio de bot por evento (`SendBotDialog`)

### 4.4 Freelancers

**Componentes**: `FreelancerSchedulesTab`, `FreelancerEvaluationsTab`, `CreateScheduleDialog`, `ScheduleCard`, `SchedulePDFGenerator`, `FreelancerAutocomplete`, `FreelancerEvaluationDialog`, `SendScheduleToGroupsDialog`, `SendAssignmentsToGroupsDialog`

**Funcionalidades**:
- Criação de escalas mensais com eventos
- Atribuição de freelancers a eventos (assignments)
- Disponibilidade pública (formulário `/escala/:id`)
- Avaliação de freelancers com notas por critério
- Geração de PDF da escala (`SchedulePDFGenerator`)
- Envio de escalas/atribuições para grupos WhatsApp
- Autocomplete de freelancers cadastrados

### 4.5 Inteligência (IA)

**Componentes**: `LeadsDoDiaTab`, `PrioridadesTab`, `FunilTab`, `FollowUpsTab`, `ResumoDiarioTab`, `TemperatureBadge`, `InlineAISummary`

**Hooks**: `useLeadIntelligence`, `useLeadSummary`, `useDailySummary`, `useScoreSnapshots`, `useLeadStageDurations`

**Funcionalidades**:
- **Score de lead**: Calculado via triggers no banco (`recalculate_lead_score`)
- **Temperatura**: `quente`, `morno`, `frio`, `congelado` — baseada em interações recentes
- **Follow-up automático**: Verificação periódica via `follow-up-check` Edge Function
- **Resumo diário**: Gerado com OpenAI via `daily-summary` Edge Function
- **Resumo individual**: `lead-summary` Edge Function
- **Snapshots de score**: Histórico para análise de tendência

### 4.6 Landing Pages Dinâmicas

**Componentes** (`src/components/dynamic-lp/`): `DLPHero`, `DLPBenefits`, `DLPGallery`, `DLPHowItWorks`, `DLPOffer`, `DLPSocialProof`, `DLPTestimonials`, `DLPVideo`, `DLPFloatingCTA`, `DLPFooter`

**Dados**: Tabela `company_landing_pages` com seções configuráveis (hero, benefits, gallery, offer, testimonials, video, footer, theme).

**Acesso**: Via domínio próprio do buffet (`/`) ou slug (`/lp/:slug`).

### 4.7 Formulários Públicos

Cada módulo segue o padrão **template + responses**:

| Módulo | Template Table | Response Table | Rota Pública |
|--------|---------------|----------------|--------------|
| Avaliação | `evaluation_templates` | `evaluation_responses` | `/avaliacao/:slug/:template` |
| Pré-festa | (configurável) | — | `/pre-festa/:slug/:template` |
| Contrato | `contrato_templates` | `contrato_responses` | `/contrato/:slug/:template` |
| Cardápio | `cardapio_templates` | `cardapio_responses` | `/cardapio/:slug/:template` |

---

## 5. Sistema de Permissões

### Camadas de Permissão

```
┌─────────────────────────────────────────┐
│  Camada 1: Role de App (user_roles)     │
│  admin | gestor | comercial | visualizacao│
├─────────────────────────────────────────┤
│  Camada 2: Role na Empresa              │
│  (user_companies.role)                  │
│  owner | admin | member                 │
├─────────────────────────────────────────┤
│  Camada 3: Permissões Granulares        │
│  (permission_definitions +              │
│   user_permissions)                     │
├─────────────────────────────────────────┤
│  Camada 4: Permissão por Unidade        │
│  (useUnitPermissions)                   │
├─────────────────────────────────────────┤
│  Camada 5: Módulos da Empresa           │
│  (useCompanyModules)                    │
└─────────────────────────────────────────┘
```

### Permissões Granulares Disponíveis

```typescript
type PermissionCode =
  | 'leads.view'
  | 'leads.edit'
  | 'leads.delete'
  | 'leads.export'
  | 'leads.assign'
  | 'users.view'
  | 'users.manage'
  | 'permissions.manage';
```

### Hooks Relacionados

| Hook | Responsabilidade |
|------|-----------------|
| `useUserRole` | Role de app do usuário logado (com retry e fallback) |
| `usePermissions` | Permissões granulares do usuário |
| `useConfigPermissions` | Permissões para tela de configurações |
| `useUnitPermissions` | Quais unidades o usuário pode ver |
| `useCompanyModules` | Quais módulos estão habilitados para a empresa |

---

## 6. Edge Functions

Todas as Edge Functions estão em `supabase/functions/` e rodam no Deno Deploy. Todas têm `verify_jwt = false` no `config.toml`.

| Função | Método | Descrição |
|--------|--------|-----------|
| `wapi-webhook` | POST | Recebe webhooks do W-API. Processa mensagens recebidas, executa Flow Builder ou bot legado, cria/atualiza conversas e leads |
| `wapi-send` | POST | Envia mensagens via W-API (texto, mídia, QR code, pairing code, status de conexão) |
| `submit-lead` | POST | Captura leads da landing page (público, sem auth) |
| `submit-b2b-lead` | POST | Captura leads B2B do formulário de prospecção |
| `manage-user` | POST | CRUD de usuários (criar, atualizar, desativar) — requer role admin |
| `daily-summary` | POST | Gera resumo diário com OpenAI baseado nas atividades do dia |
| `lead-summary` | POST | Gera resumo individual de um lead com IA |
| `fix-text` | POST | Corrige/melhora texto usando OpenAI |
| `follow-up-check` | POST | Verifica leads que precisam de follow-up automático |
| `og-fetch` | GET | Busca metadados Open Graph de uma URL |
| `og-preview` | GET | Preview de OG para links compartilhados no chat |
| `scd-discover` | POST | Integração com sistema SCD externo |
| `rotate-months` | POST | Rotação de meses disponíveis para agendamento |
| `rescue-orphan-leads` | POST | Resgata leads que ficaram sem empresa associada |
| `migrate-aventura-images` | POST | Migração pontual de imagens (one-time) |

### Secrets Necessários nas Edge Functions

```
SUPABASE_URL           — URL do projeto Supabase
SUPABASE_SERVICE_ROLE_KEY — Chave de serviço (acesso total)
OPENAI_API_KEY         — Para funções de IA (daily-summary, lead-summary, fix-text)
WAPI_BASE_URL          — Base URL da API W-API
WAPI_TOKEN             — Token de autenticação W-API
```

---

## 7. Banco de Dados

### Tabelas Principais

| Tabela | Descrição | Multi-tenant |
|--------|-----------|:------------:|
| `companies` | Empresas (com hierarquia pai/filho via `parent_id`) | — |
| `user_companies` | Relação N:N usuários ↔ empresas (com role) | — |
| `user_roles` | Role de app do usuário | — |
| `user_permissions` | Permissões granulares por usuário | — |
| `permission_definitions` | Definição das permissões disponíveis | — |
| `company_units` | Unidades do buffet (ex: Unidade 1, Unidade 2) | ✅ |
| `campaign_leads` | Leads do CRM | ✅ |
| `company_events` | Eventos/festas agendadas | ✅ |
| `company_landing_pages` | Configuração da LP dinâmica (1:1 com empresa) | ✅ |
| `company_packages` | Pacotes de festa oferecidos | ✅ |
| `company_onboarding` | Dados de onboarding do buffet | ✅ |
| `wapi_conversations` | Conversas do WhatsApp | ✅ |
| `wapi_messages` | Mensagens do WhatsApp | ✅ |
| `conversation_flows` | Fluxos do Flow Builder | ✅ |
| `flow_nodes` | Nós dos fluxos | — |
| `flow_edges` | Conexões entre nós | — |
| `flow_node_options` | Opções de resposta dos nós | — |
| `flow_lead_state` | Estado do lead dentro do fluxo | — |
| `evaluation_templates` | Templates de avaliação | ✅ |
| `evaluation_responses` | Respostas de avaliações | ✅ |
| `contrato_templates` | Templates de contrato | ✅ |
| `contrato_responses` | Respostas de contratos | ✅ |
| `cardapio_templates` | Templates de cardápio | ✅ |
| `cardapio_responses` | Respostas de cardápios | ✅ |
| `event_checklist_items` | Itens de checklist por evento | ✅ |
| `event_checklist_templates` | Templates de checklist | ✅ |
| `event_staff_entries` | Equipe escalada por evento | ✅ |
| `event_info_entries` | Informações adicionais do evento | ✅ |
| `attendance_entries` | Listas de presença | ✅ |
| `freelancer_schedules` | Escalas de freelancers | ✅ |
| `freelancer_assignments` | Atribuições freelancer ↔ evento | ✅ |
| `freelancer_availability` | Disponibilidade informada | ✅ |
| `freelancer_evaluations` | Avaliações de freelancers | ✅ |
| `daily_summaries` | Resumos diários gerados por IA | ✅ |
| `ai_usage_logs` | Log de consumo de IA | ✅ |
| `b2b_leads` | Leads B2B (prospecção) | — |

### Triggers Principais

| Trigger | Tabela | Descrição |
|---------|--------|-----------|
| `recalculate_lead_score` | `campaign_leads` | Recalcula score do lead em mudanças de status/dados |
| `fn_notify_temperature_change` | `campaign_leads` | Notifica quando temperatura do lead muda |
| `fn_snapshot_score` | `campaign_leads` | Salva snapshot do score para histórico |

### Storage Buckets

| Bucket | Público | Uso |
|--------|:-------:|-----|
| `whatsapp-media` | Não | Mídias recebidas/enviadas no WhatsApp |
| `company-logos` | Sim | Logos das empresas |
| `landing-pages` | Sim | Imagens das landing pages |
| `onboarding-uploads` | Sim | Arquivos do onboarding (fotos, orçamentos) |
| `sales-materials` | Sim | Materiais de venda (catálogos, vídeos) |
| `event-info-attachments` | Sim | Anexos de informações de eventos |
| `training-videos` | Sim | Vídeos de treinamento |

### RPCs / Funções de Banco (30+)

| Função | Tipo | Descrição |
|--------|------|-----------|
| `get_company_by_domain(_domain)` | Query | Resolve empresa pelo domínio canonical |
| `get_landing_page_by_domain(_domain)` | Query | LP completa por domínio |
| `get_landing_page_by_slug(_slug)` | Query | LP completa por slug |
| `get_company_branding_by_slug(_slug)` | Query | Nome + logo por slug |
| `get_company_branding_by_domain(_domain)` | Query | Nome + logo por domínio |
| `get_company_branding_by_domain_fuzzy(_base)` | Query | Branding por match parcial |
| `get_company_id_by_slug(_slug)` | Query | UUID da empresa por slug |
| `get_company_public_info(_id)` | Query | Info pública (id, name, logo, slug) |
| `get_company_public_with_settings(_id)` | Query | Info pública + settings |
| `get_onboarding_public_fields(_id)` | Query | WhatsApp, unidades, instagram |
| `get_evaluation_template_public(_id)` | Query | Template de avaliação (público) |
| `get_evaluation_template_by_slugs(company, template)` | Query | Template por slugs |
| `get_prefesta_template_public(_id)` | Query | Template pré-festa (público) |
| `get_prefesta_template_by_slugs(company, template)` | Query | Template por slugs |
| `get_contrato_template_public(_id)` | Query | Template contrato (público) |
| `get_contrato_template_by_slugs(company, template)` | Query | Template por slugs |
| `get_cardapio_template_public(_id)` | Query | Template cardápio (público) |
| `get_cardapio_template_by_slugs(company, template)` | Query | Template por slugs |
| `get_freelancer_template_public(_id)` | Query | Template freelancer (público) |
| `get_freelancer_template_by_slugs(company, template)` | Query | Template por slugs |
| `get_event_public_info(_event_id)` | Query | Info pública do evento |
| `get_events_public_list(_company_id)` | Query | Lista de eventos por empresa |
| `get_company_events_for_cardapio(_company_id)` | Query | Eventos para seleção no cardápio |
| `get_profiles_for_transfer()` | Query | Perfis disponíveis para transferência |
| `is_admin(_user_id)` | Auth | Verifica se é admin global |
| `get_user_company_ids(_user_id)` | Auth | IDs de empresas acessíveis (recursivo) |
| `user_has_company_access(_user_id, _company_id)` | Auth | Verifica acesso à empresa |
| `get_user_default_company(_user_id)` | Auth | Empresa padrão do usuário |
| `can_manage_permissions(_user_id, _target)` | Auth | Pode gerenciar permissões do target? |
| `recalculate_lead_score(_lead_id)` | Lógica | Recalcula score + temperatura do lead |
| `reset_company_data(_company_id, ...)` | Admin | Limpa dados de uma empresa (admin only) |
| `increment_freelancer_template_views(_id)` | Contagem | Incrementa views do template |
| `update_updated_at_column()` | Trigger | Atualiza `updated_at` automaticamente |
| `fn_trigger_recalc_score()` | Trigger | Dispara recálculo de score |
| `fn_trigger_recalc_score_from_history()` | Trigger | Recálculo via lead_history |
| `fn_notify_temperature_change()` | Trigger | Notifica mudanças de temperatura |
| `fn_snapshot_score()` | Trigger | Salva snapshot diário do score |

### Secrets do Supabase

| Secret | Descrição |
|--------|-----------|
| `SUPABASE_URL` | URL do projeto |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço (acesso total) |
| `SUPABASE_ANON_KEY` | Chave anon (público) |
| `SUPABASE_DB_URL` | URL de conexão direta ao Postgres |
| `SUPABASE_PUBLISHABLE_KEY` | Chave publicável |
| `OPENAI_API_KEY` | API da OpenAI (IA) |
| `SCD_API_TOKEN` | Token da integração SCD |
| `LOVABLE_API_KEY` | API key do Lovable |

---

## 8. Hooks Customizados

| Hook | Arquivo | Responsabilidade |
|------|---------|-----------------|
| `useCompany` | `CompanyContext.tsx` | Empresa ativa, troca de empresa, role na empresa |
| `useUserRole` | `useUserRole.ts` | Role de app com retry automático (3 tentativas) |
| `usePermissions` | `usePermissions.ts` | Permissões granulares do usuário |
| `useConfigPermissions` | `useConfigPermissions.ts` | Permissões específicas da tela de configurações |
| `useUnitPermissions` | `useUnitPermissions.ts` | Unidades visíveis para o usuário |
| `useCompanyModules` | `useCompanyModules.ts` | Módulos habilitados da empresa |
| `useCompanyUnits` | `useCompanyUnits.ts` | Lista de unidades da empresa |
| `useCurrentCompanyId` | `useCurrentCompanyId.ts` | Shortcut para ID da empresa ativa |
| `useMobile` | `use-mobile.tsx` | Detecção de viewport mobile |
| `useToast` | `use-toast.ts` | Sistema de notificações toast |
| `useWhatsAppConnection` | `useWhatsAppConnection.ts` | Status da conexão WhatsApp (QR, connected, etc.) |
| `useMessagesRealtime` | `useMessagesRealtime.ts` | Subscription realtime de mensagens WhatsApp |
| `useRealtimeOptimized` | `useRealtimeOptimized.ts` | Wrapper otimizado para subscriptions Supabase |
| `useNotifications` | `useNotifications.ts` | Sistema de notificações internas |
| `useAppNotifications` | `useAppNotifications.ts` | Notificações de app (bell icon) |
| `useLeadNotifications` | `useLeadNotifications.ts` | Notificações específicas de leads |
| `useNotificationSounds` | `useNotificationSounds.ts` | Sons de notificação |
| `useChatNotificationToggle` | `useChatNotificationToggle.ts` | Toggle de notificações por conversa |
| `useLeadIntelligence` | `useLeadIntelligence.ts` | Score, temperatura, prioridades de leads |
| `useLeadSummary` | `useLeadSummary.ts` | Resumo de lead com IA |
| `useDailySummary` | `useDailySummary.ts` | Resumo diário com IA |
| `useScoreSnapshots` | `useScoreSnapshots.ts` | Histórico de score de leads |
| `useLeadStageDurations` | `useLeadStageDurations.ts` | Tempo que lead ficou em cada estágio |
| `useFilterOrder` | `useFilterOrder.ts` | Persistência de ordem de filtros |
| `useAudioRecorder` | `useAudioRecorder.ts` | Gravação de áudio para WhatsApp |

---

## 9. Configuração do Ambiente

### Pré-requisitos

- **Node.js** ≥ 18
- **npm** ou **bun** (bun preferencial para performance)
- Conta no **Supabase** (ou usar Lovable Cloud)

### Variáveis de Ambiente

O arquivo `.env` é auto-populado pelo Lovable:

```env
VITE_SUPABASE_PROJECT_ID="rsezgnkfhodltrsewlhz"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJ..."
VITE_SUPABASE_URL="https://rsezgnkfhodltrsewlhz.supabase.co"
```

> ⚠️ Apenas chaves **publicáveis** ficam no `.env`. Chaves privadas (service role, OpenAI, W-API) ficam nos **Secrets do Supabase** e são acessíveis apenas nas Edge Functions.

### Secrets do Supabase (Edge Functions)

| Secret | Usado por |
|--------|-----------|
| `SUPABASE_URL` | Todas |
| `SUPABASE_SERVICE_ROLE_KEY` | Todas |
| `OPENAI_API_KEY` | `daily-summary`, `lead-summary`, `fix-text`, `wapi-webhook` |
| `WAPI_BASE_URL` | `wapi-send`, `wapi-webhook` |
| `WAPI_TOKEN` | `wapi-send`, `wapi-webhook` |

### Comandos

```bash
# Instalar dependências
npm install

# Desenvolvimento local
npm run dev

# Build de produção
npm run build

# Build de desenvolvimento (sem minificação)
npm run build:dev

# Testes
npm test          # Roda uma vez
npm run test:watch # Watch mode

# Lint
npm run lint
```

### Domínios

| Ambiente | Domínio | Comportamento |
|----------|---------|--------------|
| Local | `localhost:5173` | Renderiza LP do Castelo (preview default) |
| Preview Lovable | `*.lovable.app` / `*.lovableproject.com` | Renderiza LP do Castelo |
| Hub Produção | `hubcelebrei.com.br` | Hub Landing Page |
| Buffet Produção | Domínio customizado | LP dinâmica do buffet |

---

## 10. Convenções e Padrões

### Estrutura de Pastas

```
src/
├── assets/              # Imagens e mídias estáticas (importadas via ES6)
├── components/
│   ├── ui/              # shadcn/ui (não editar diretamente)
│   ├── admin/           # Componentes do painel do buffet
│   ├── agenda/          # Componentes da agenda
│   ├── dynamic-lp/      # Seções da landing page dinâmica
│   ├── flowbuilder/     # Flow Builder visual
│   ├── freelancer/      # Gestão de freelancers
│   ├── hub/             # Componentes do Hub (admin)
│   ├── hub-landing/     # Landing page do Hub
│   ├── inteligencia/    # Módulo de inteligência/IA
│   ├── landing/         # Landing page estática (promo)
│   ├── whatsapp/        # Chat e configurações WhatsApp
│   └── b2b/             # Componentes B2B
├── config/              # Configurações estáticas (campanhas, etc.)
├── contexts/            # React Contexts (CompanyContext)
├── hooks/               # Hooks customizados
├── integrations/
│   └── supabase/        # Cliente Supabase + tipos gerados
├── lib/                 # Utilitários (format-message, mask-utils, supabase-helpers)
├── pages/               # Páginas (1 arquivo = 1 rota)
├── test/                # Setup de testes
└── types/               # TypeScript types (crm, company, landing-page)
```

### Nomenclatura

- **Componentes**: PascalCase (`LeadDetailSheet.tsx`)
- **Hooks**: camelCase com prefixo `use` (`useLeadIntelligence.ts`)
- **Páginas**: PascalCase (`CentralAtendimento.tsx`)
- **Utilitários**: kebab-case (`supabase-helpers.ts`)
- **Types**: kebab-case (`landing-page.ts`)

### Padrão de Queries com Multi-Tenant

```typescript
// ✅ Correto — sempre filtrar por company_id
const { data } = await supabase
  .from('campaign_leads')
  .select('*')
  .eq('company_id', companyId)
  .order('created_at', { ascending: false });

// ✅ Usar helper para inserts
await insertWithCompany('campaign_leads', { name, whatsapp, status: 'novo' });

// ❌ Errado — nunca fazer query sem company_id
const { data } = await supabase.from('campaign_leads').select('*');
```

### Padrão de Notificações

```typescript
import { toast } from 'sonner';

// Sucesso
toast.success('Lead salvo com sucesso');

// Erro
toast.error('Erro ao salvar lead');

// Com ação
toast('Nova mensagem recebida', {
  action: { label: 'Ver', onClick: () => navigate('/atendimento') },
});
```

### Design System

- Usar **tokens semânticos** do `index.css` (`--primary`, `--background`, etc.)
- Nunca usar cores hardcoded nos componentes
- Componentes UI via **shadcn/ui** (pasta `src/components/ui/`)
- Animações via **Framer Motion**
- Responsividade via classes Tailwind (`md:`, `lg:`)

---

## Apêndice: Diagrama de Arquitetura Simplificado

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Usuário    │     │   WhatsApp   │     │   Landing    │
│   (Browser)  │     │   (W-API)    │     │   Page       │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       ▼                    ▼                    ▼
┌──────────────────────────────────────────────────────────┐
│                    React App (Vite)                       │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │
│  │   Hub   │  │  Painel │  │  Public  │  │  Auth   │   │
│  │  Portal │  │  Buffet │  │  Forms   │  │  Pages  │   │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘   │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│                  Supabase Backend                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐ │
│  │ Postgres │  │   Auth   │  │  Edge    │  │Storage │ │
│  │ (RLS)    │  │          │  │Functions │  │        │ │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘ │
│  ┌──────────┐                                          │
│  │ Realtime │                                          │
│  └──────────┘                                          │
└──────────────────────────────────────────────────────────┘
                       │
                       ▼
          ┌────────────────────────┐
          │   Serviços Externos    │
          │  ┌───────┐  ┌───────┐ │
          │  │OpenAI │  │ W-API │ │
          │  └───────┘  └───────┘ │
          └────────────────────────┘
```

---

*Documento gerado automaticamente. Para contribuir, edite este arquivo e faça commit no repositório.*
