-- 1) Confirmação de visita: lembrete na véspera (Automações → Visitas)
ALTER TABLE public.visit_confirmation_settings
  ADD COLUMN IF NOT EXISTS eve_reminder_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS eve_reminder_hour integer NOT NULL DEFAULT 18;

-- 2) Alerta de festa nos próximos 60 dias (Configurar IA)
ALTER TABLE public.ai_agent_settings
  ADD COLUMN IF NOT EXISTS party_soon_alert boolean NOT NULL DEFAULT false;

-- 3) Data do fechamento do lead (para "Fechados depois da reativação")
ALTER TABLE public.campaign_leads
  ADD COLUMN IF NOT EXISTS closed_at timestamptz;

CREATE OR REPLACE FUNCTION public.set_lead_closed_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'fechado' THEN
    IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'fechado' THEN
      NEW.closed_at := now();
    END IF;
  ELSE
    NEW.closed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lead_closed_at ON public.campaign_leads;
CREATE TRIGGER trg_lead_closed_at
  BEFORE INSERT OR UPDATE OF status ON public.campaign_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_lead_closed_at();

-- Fechados de antes: usa a última "Alteração de status" para Fechado do histórico
UPDATE public.campaign_leads l
SET closed_at = h.created_at
FROM (
  SELECT DISTINCT ON (lead_id) lead_id, created_at
  FROM public.lead_history
  WHERE action = 'Alteração de status' AND lower(new_value) = 'fechado'
  ORDER BY lead_id, created_at DESC
) h
WHERE l.id = h.lead_id AND l.status = 'fechado' AND l.closed_at IS NULL;
