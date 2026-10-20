-- Dados do contratante: pedido direto da conversa (sem festa na Agenda ainda),
-- envio automático ao marcar "Fechado", cobranças no horário de atendimento e
-- avisos para a equipe. Tudo desligado por padrão em cada buffet.

-- 1) Pedido pode nascer só com o lead; vira da festa quando ela é criada
ALTER TABLE public.client_data_requests ALTER COLUMN event_id DROP NOT NULL;
ALTER TABLE public.client_data_requests
  ADD COLUMN IF NOT EXISTS reminder_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reminder_at timestamptz,
  ADD COLUMN IF NOT EXISTS overdue_alerted_at timestamptz,
  ADD COLUMN IF NOT EXISTS notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS sent_via text;
CREATE INDEX IF NOT EXISTS idx_client_data_requests_lead ON public.client_data_requests(lead_id);

-- Pedidos antigos: sem cobrança nem aviso retroativo
UPDATE public.client_data_requests
SET notified_at = COALESCE(completed_at, now())
WHERE status IN ('completed', 'reviewed') AND notified_at IS NULL;
UPDATE public.client_data_requests
SET reminder_count = 99, overdue_alerted_at = now()
WHERE status IN ('pending', 'sent');

-- 2) Configuração (Automações → Formulários → Dados do Contratante)
ALTER TABLE public.form_automation_settings
  ADD COLUMN IF NOT EXISTS auto_on_closed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminders_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_hours integer[] NOT NULL DEFAULT '{24,48,72}',
  ADD COLUMN IF NOT EXISTS reminder_messages text[];

-- 3) Formulário público também sem festa (LEFT JOIN)
CREATE OR REPLACE FUNCTION public.get_client_data_request_by_token(_token text)
RETURNS TABLE(
  id uuid,
  company_id uuid,
  event_id uuid,
  status text,
  company_name text,
  company_logo text,
  event_title text,
  event_date date
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    cdr.id,
    cdr.company_id,
    cdr.event_id,
    cdr.status,
    c.name AS company_name,
    c.logo_url AS company_logo,
    ce.title AS event_title,
    ce.event_date
  FROM public.client_data_requests cdr
  JOIN public.companies c ON c.id = cdr.company_id
  LEFT JOIN public.company_events ce ON ce.id = cdr.event_id
  WHERE cdr.token = _token
  LIMIT 1;
$$;

-- 4) Festa criada para o lead: o pedido (e os aniversariantes já preenchidos) vão para ela
CREATE OR REPLACE FUNCTION public.attach_client_data_to_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_children jsonb;
  v_birthdate text;
BEGIN
  IF NEW.lead_id IS NULL THEN RETURN NEW; END IF;
  BEGIN
    UPDATE public.client_data_requests
      SET event_id = NEW.id
      WHERE lead_id = NEW.lead_id AND company_id = NEW.company_id AND event_id IS NULL;

    IF NEW.child_name IS NULL THEN
      SELECT client_data->'birthday_children' INTO v_children
        FROM public.client_data_requests
        WHERE event_id = NEW.id AND status IN ('completed', 'reviewed')
        ORDER BY completed_at DESC NULLS LAST LIMIT 1;
      IF v_children IS NOT NULL AND jsonb_typeof(v_children) = 'array' AND jsonb_array_length(v_children) > 0 THEN
        v_birthdate := v_children->0->>'birthdate';
        UPDATE public.company_events
          SET birthday_children = v_children,
              child_name = v_children->0->>'name',
              child_age = v_children->0->>'age',
              child_birthdate = CASE WHEN v_birthdate IS NOT NULL AND v_birthdate <> '' THEN v_birthdate::date ELSE NULL END
          WHERE id = NEW.id;
      END IF;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    NULL; -- nunca impede salvar a festa
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_attach_client_data_to_event ON public.company_events;
CREATE TRIGGER trg_attach_client_data_to_event
  AFTER INSERT OR UPDATE OF lead_id ON public.company_events
  FOR EACH ROW EXECUTE FUNCTION public.attach_client_data_to_event();
