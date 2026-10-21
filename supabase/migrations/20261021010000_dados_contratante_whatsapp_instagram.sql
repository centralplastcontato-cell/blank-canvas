-- Tela final dos dados do contratante: "Voltar para o WhatsApp" abre o número
-- em que o cliente estava conversando (reply_phone) e o Instagram do Castelo
-- certo (o cadastro tinha um valor de teste).

DROP FUNCTION IF EXISTS public.get_client_data_request_by_token(text);
CREATE FUNCTION public.get_client_data_request_by_token(_token text)
RETURNS TABLE(
  id uuid,
  company_id uuid,
  event_id uuid,
  status text,
  company_name text,
  company_logo text,
  event_title text,
  event_date date,
  reply_phone text
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
    ce.event_date,
    (
      SELECT i.phone_number
      FROM public.wapi_conversations w
      JOIN public.wapi_instances i ON i.id = w.instance_id
      WHERE cdr.lead_id IS NOT NULL AND w.lead_id = cdr.lead_id
        AND w.remote_jid NOT LIKE '%@g.us' AND i.phone_number IS NOT NULL
      ORDER BY w.last_message_at DESC NULLS LAST
      LIMIT 1
    ) AS reply_phone
  FROM public.client_data_requests cdr
  JOIN public.companies c ON c.id = cdr.company_id
  LEFT JOIN public.company_events ce ON ce.id = cdr.event_id
  WHERE cdr.token = _token
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_client_data_request_by_token(text) TO anon, authenticated;

UPDATE public.company_onboarding
SET instagram = '@castelodadiversao'
WHERE company_id = 'a0000000-0000-0000-0000-000000000001' AND instagram = '@kjdhkjd';
