-- "Vou agendar depois": data que o cliente combinou para retomar (Automações → Visitas)
ALTER TABLE public.campaign_leads
  ADD COLUMN IF NOT EXISTS return_at date,
  ADD COLUMN IF NOT EXISTS return_when_text text,
  ADD COLUMN IF NOT EXISTS return_note text,
  ADD COLUMN IF NOT EXISTS return_status text,
  ADD COLUMN IF NOT EXISTS return_set_at timestamptz,
  ADD COLUMN IF NOT EXISTS return_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_campaign_leads_return_pending
  ON public.campaign_leads (company_id, return_at) WHERE return_status = 'pending';

ALTER TABLE public.visit_confirmation_settings
  ADD COLUMN IF NOT EXISTS scheduled_return_enabled boolean NOT NULL DEFAULT false;

-- Liga no Castelo da Diversão
UPDATE public.visit_confirmation_settings
SET scheduled_return_enabled = true
WHERE company_id = 'a0000000-0000-0000-0000-000000000001';
