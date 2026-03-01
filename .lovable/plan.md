
# Documentacao Tecnica Interna - Celebrei Hub

Vou criar um arquivo Markdown completo no repositorio com toda a documentacao tecnica do projeto. O documento sera salvo em `docs/TECHNICAL_DOCS.md`.

---

## Conteudo do Documento

### 1. Visao Geral do Projeto
- Plataforma SaaS multi-tenant para gestao de buffets infantis
- Stack: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + Supabase
- Dois portais independentes: Hub (grupo) e Painel do Buffet (operacional)

### 2. Arquitetura Multi-Tenant
- Resolucao de dominio via `useDomainDetection.ts` (Hub vs Buffet vs Preview)
- `RootPage.tsx` como roteador raiz baseado em dominio
- `CompanyContext` para gerenciar empresa ativa, troca de empresa, e hierarquia pai/filho
- Mapeamento de dominios conhecidos em `KNOWN_BUFFET_DOMAINS`

### 3. Estrutura de Rotas (48 paginas)
- Rotas do Hub (`/hub/*`): Dashboard, Empresas, Users, WhatsApp, Onboarding, Prospeccao, IA, Treinamento, Leads
- Rotas do Painel Buffet (`/atendimento`, `/configuracoes`, `/inteligencia`, `/agenda`, etc.)
- Rotas Publicas (`/festa/:id`, `/lp/:slug`, `/avaliacao/...`, `/contrato/...`, `/cardapio/...`, `/equipe/...`, `/escala/...`)
- Redirects de compatibilidade (`/admin` -> `/atendimento`, etc.)

### 4. Modulos Principais
- **CRM/Leads**: Kanban, tabela, filtros, transferencia, exportacao
- **WhatsApp (W-API)**: Chat em tempo real, bot qualificador, Flow Builder visual
- **Agenda**: Calendario de eventos, checklists, equipe, manutencao, monitoramento
- **Freelancers**: Escalas, avaliacoes, disponibilidade publica, PDF
- **Inteligencia**: Score de leads, temperatura, follow-ups, resumo diario (OpenAI)
- **Landing Pages Dinamicas**: LP por empresa com tema customizavel
- **Formularios Publicos**: Avaliacao, Pre-festa, Contrato, Cardapio, Freelancer

### 5. Sistema de Permissoes
- Roles de app: `admin`, `gestor`, `comercial`, `visualizacao`
- Roles de empresa: `owner`, `admin`, `member`
- Permissoes granulares via `permission_definitions` + `user_permissions`
- Permissoes por unidade (`useUnitPermissions`)
- Modulos habilitaveis por empresa (`useCompanyModules`)

### 6. Edge Functions (15 funcoes)
- `wapi-webhook`: Webhook do WhatsApp, processa mensagens, roda Flow Builder ou bot legado
- `wapi-send`: Envia mensagens, QR code, status, pairing code
- `submit-lead`: Captura de leads da LP
- `submit-b2b-lead`: Captura de leads B2B
- `manage-user`: CRUD de usuarios (admin only)
- `daily-summary`: Resumo diario com OpenAI
- `lead-summary`: Resumo individual de lead com IA
- `fix-text`: Correcao de texto com IA
- `follow-up-check`: Verificacao automatica de follow-ups
- `og-fetch` / `og-preview`: Open Graph metadata
- `scd-discover`: Integracao SCD
- `rotate-months`: Rotacao de meses
- `rescue-orphan-leads`: Resgate de leads orfaos
- `migrate-aventura-images`: Migracao pontual

### 7. Banco de Dados
- Tabelas principais e seus relacionamentos
- 30+ RPCs/funcoes de banco (branding, permissoes, scoring, etc.)
- Triggers: `recalculate_lead_score`, `fn_notify_temperature_change`, `fn_snapshot_score`
- Storage buckets: 7 buckets (whatsapp-media, company-logos, landing-pages, etc.)

### 8. Hooks Customizados (25 hooks)
- Listagem e descricao de cada hook com sua responsabilidade

### 9. Configuracao do Ambiente de Desenvolvimento
- Requisitos (Node.js, npm/bun)
- Variaveis de ambiente (`.env` auto-populado pelo Lovable)
- Secrets do Supabase necessarios
- Comandos (`npm run dev`, `npm run build`, `npm test`)
- Dominio local vs preview vs producao

### 10. Convencoes e Padroes
- Estrutura de pastas
- Nomenclatura de componentes e hooks
- Uso de `supabase-helpers.ts` para queries com company_id
- Padrao de notificacoes com isolamento multi-tenant

---

## Detalhes Tecnicos

**Arquivo criado:** `docs/TECHNICAL_DOCS.md` (~400-500 linhas de Markdown)

O documento sera escrito em portugues, completo e copiavel, cobrindo todos os pontos acima com exemplos de codigo onde relevante (imports, estrutura de queries, etc.).
