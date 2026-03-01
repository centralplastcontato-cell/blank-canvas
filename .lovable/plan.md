
# Campanhas de Marketing via WhatsApp

## Visao Geral

Criar um modulo completo de **campanhas de disparo em massa** via WhatsApp, reutilizando a base de leads existente, a infraestrutura de envio (`wapi-send`) e a IA (Lovable AI) para gerar variacoes de texto que reduzem o risco de bloqueio.

---

## Fluxo do Usuario

1. Acessa "Campanhas" no menu lateral
2. Ve a lista de campanhas anteriores (com metricas)
3. Clica em "Nova Campanha"
4. **Wizard de 3 etapas**:
   - **Etapa 1 - Contexto**: Descreve brevemente o objetivo (ex: "Promover festa de abril com 10% desconto"). A IA gera 5 variacoes de texto automaticamente. O usuario pode editar, regenerar ou adicionar imagem.
   - **Etapa 2 - Audiencia**: Filtra leads por mes, status, unidade, campanha. Ve a lista e seleciona individualmente ou todos.
   - **Etapa 3 - Configuracao**: Define intervalo entre mensagens (ex: 30-90s), agenda para agora ou data/hora futura. Revisa resumo.
5. Inicia o disparo. Ve progresso em tempo real (igual ao envio para freelancers: lista com status por contato, minimizavel, countdown entre envios).
6. Ao finalizar, ve o relatorio: total enviado, sucesso, falhas.

---

## Arquitetura Tecnica

### 1. Banco de Dados (2 tabelas novas)

**`campaigns`** - Armazena cada campanha criada
- `id` (uuid, PK)
- `company_id` (uuid, FK companies)
- `created_by` (uuid, FK profiles.user_id)
- `name` (text) - nome/titulo da campanha
- `description` (text, nullable) - contexto dado a IA
- `message_variations` (jsonb) - array de 5 textos gerados
- `image_url` (text, nullable) - URL da imagem no Storage
- `filters` (jsonb) - filtros usados (mes, status, unidade, etc.)
- `delay_seconds` (integer, default 60)
- `status` (text: draft, sending, completed, cancelled)
- `total_recipients` (integer, default 0)
- `sent_count` (integer, default 0)
- `error_count` (integer, default 0)
- `scheduled_at` (timestamptz, nullable)
- `started_at` (timestamptz, nullable)
- `completed_at` (timestamptz, nullable)
- `created_at` / `updated_at`

**`campaign_recipients`** - Cada destinatario individual
- `id` (uuid, PK)
- `campaign_id` (uuid, FK campaigns)
- `lead_id` (uuid, FK campaign_leads)
- `phone` (text) - numero formatado
- `lead_name` (text) - nome do lead
- `variation_index` (integer) - qual variacao de texto foi usada (0-4)
- `status` (text: pending, sent, error)
- `error_message` (text, nullable)
- `sent_at` (timestamptz, nullable)
- `created_at`

RLS: Acesso restrito via `user_has_company_access(auth.uid(), company_id)`.

### 2. Storage

Reutilizar o bucket `sales-materials` (publico) para upload de imagens de campanha, ou criar um sub-path `campaigns/` dentro dele.

### 3. Modulo no Sistema de Modulos

Adicionar `campanhas: boolean` ao `CompanyModules` e ao `useCompanyModules`, default `false` (ativacao via Hub). Condicionar a visibilidade no sidebar e mobile menu.

### 4. Edge Function para IA

Reutilizar a Edge Function `support-chat` como referencia para criar uma nova **`campaign-ai`** que:
- Recebe o contexto do usuario + nome da empresa
- Usa Lovable AI (Gemini Flash) com tool calling para retornar exatamente 5 variacoes de texto
- Cada variacao tem tom ligeiramente diferente (formal, amigavel, urgente, curto, detalhado)
- Suporta variavel `{nome}` para personalizacao

### 5. Frontend - Novas Paginas/Componentes

- **`src/pages/Campanhas.tsx`** - Pagina principal com lista de campanhas + botao "Nova Campanha"
- **`src/components/campanhas/CampaignWizard.tsx`** - Wizard de 3 etapas
- **`src/components/campanhas/CampaignContextStep.tsx`** - Etapa 1 (contexto + IA)
- **`src/components/campanhas/CampaignAudienceStep.tsx`** - Etapa 2 (filtros + selecao de leads)
- **`src/components/campanhas/CampaignConfigStep.tsx`** - Etapa 3 (delay, agendamento, resumo)
- **`src/components/campanhas/CampaignSendDialog.tsx`** - Dialog de envio com progresso (reutilizando o padrao do `SendScheduleToGroupsDialog`: lista com status, minimizavel, countdown)
- **`src/components/campanhas/CampaignReport.tsx`** - Relatorio pos-envio

### 6. Logica de Disparo

- O envio acontece no **frontend** (mesmo padrao do envio para grupos/freelancers)
- Itera pelos destinatarios, alternando entre as 5 variacoes (`variation_index = i % 5`)
- Substitui `{nome}` pelo nome do lead
- Se tem imagem: usa `wapi-send` com `action: "send-image"` + caption
- Se so texto: usa `action: "send-text"`
- Delay configuravel entre mensagens (default 60s) + jitter aleatorio
- Atualiza `campaign_recipients.status` e `campaigns.sent_count` em tempo real
- Suporta minimizar e continuar em background

### 7. Rota e Navegacao

- Nova rota `/campanhas` no `App.tsx`
- Menu lateral (AdminSidebar + MobileMenu): item "Campanhas" com icone `Megaphone`, condicionado ao modulo `campanhas`

---

## Estimativa de Escopo

| Item | Complexidade |
|------|-------------|
| Migracao DB (2 tabelas + RLS) | Baixa |
| Edge Function campaign-ai | Media |
| Pagina + Wizard (3 etapas) | Alta |
| Dialog de envio com progresso | Media (reutiliza padrao) |
| Relatorio de campanha | Baixa |
| Integracao sidebar/modulos | Baixa |

---

## O Que NAO Esta no Escopo (futuro)

- Agendamento automatico server-side (cron) - por enquanto so "enviar agora"
- Metricas de leitura/resposta (dependeria de webhook de status)
- A/B testing formal entre variacoes
- Blacklist/opt-out automatico

