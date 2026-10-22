-- Confraternização de empresas (Castelo, 22/10): a IA reconhece o lead de
-- empresa, segue um roteiro próprio (sem aniversariante) e marca o lead.

-- Tipo do lead: 'empresa' = confraternização (vazio = festa de aniversário, como sempre)
ALTER TABLE public.campaign_leads ADD COLUMN IF NOT EXISTS lead_kind text;
CREATE INDEX IF NOT EXISTS idx_campaign_leads_lead_kind ON public.campaign_leads (company_id, lead_kind) WHERE lead_kind IS NOT NULL;

-- Liga por buffet + capacidade máxima do espaço
ALTER TABLE public.ai_agent_settings ADD COLUMN IF NOT EXISTS corporate_events_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.ai_agent_settings ADD COLUMN IF NOT EXISTS corporate_max_guests integer;

UPDATE public.ai_agent_settings
SET corporate_events_enabled = true, corporate_max_guests = 120
WHERE company_id = 'a0000000-0000-0000-0000-000000000001';
