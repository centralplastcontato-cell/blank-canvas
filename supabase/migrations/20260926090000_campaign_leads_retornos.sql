-- Retorno de leads sem apagar a data de chegada.
--
-- Antes, quando um lead existente pedia orçamento de novo, created_at era
-- sobrescrito com a data do retorno: ele "virava novo" nas contagens e a data
-- do primeiro contato se perdia. Agora:
--   created_at      = primeiro contato (nunca muda)
--   last_return_at  = último retorno (site ou WhatsApp)
--   return_count    = quantas vezes voltou
--   last_entry_at   = a entrada mais recente (chegada ou retorno), usada para
--                     ordenar as listas e manter quem voltou no topo
--
-- last_entry_at é calculada pelo banco a partir das outras duas, então não há
-- atualização em massa de leads (a tabela está no realtime e isso dispararia um
-- evento por lead nas telas abertas). GREATEST ignora NULL.

ALTER TABLE public.campaign_leads
  ADD COLUMN IF NOT EXISTS last_return_at timestamptz,
  ADD COLUMN IF NOT EXISTS return_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.campaign_leads
  ADD COLUMN IF NOT EXISTS last_entry_at timestamptz
  GENERATED ALWAYS AS (GREATEST(created_at, last_return_at)) STORED;

CREATE INDEX IF NOT EXISTS idx_campaign_leads_company_last_entry
  ON public.campaign_leads (company_id, last_entry_at DESC);

CREATE INDEX IF NOT EXISTS idx_campaign_leads_company_last_return
  ON public.campaign_leads (company_id, last_return_at)
  WHERE last_return_at IS NOT NULL;
