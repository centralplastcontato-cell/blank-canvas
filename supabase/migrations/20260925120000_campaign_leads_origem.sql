-- Origem de captação do lead (ex.: 'mesa' = QR Code das mesas do salão).
-- Nula para leads antigos e para quem não veio de uma origem rastreada.
-- Gravada só na criação do lead; retornos e reenvios não a sobrescrevem.
ALTER TABLE public.campaign_leads
  ADD COLUMN IF NOT EXISTS origem text;

CREATE INDEX IF NOT EXISTS idx_campaign_leads_company_origem
  ON public.campaign_leads (company_id, origem);
