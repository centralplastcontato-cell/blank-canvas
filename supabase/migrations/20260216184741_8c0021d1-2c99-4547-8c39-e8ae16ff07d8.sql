
CREATE OR REPLACE FUNCTION public.get_company_events_for_cardapio(_company_id uuid)
RETURNS TABLE(event_id uuid, event_title text, event_date date, lead_name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    ce.id AS event_id,
    ce.title AS event_title,
    ce.event_date,
    cl.name AS lead_name
  FROM public.company_events ce
  JOIN public.campaign_leads cl ON cl.id = ce.lead_id
  WHERE ce.company_id = _company_id
    AND ce.lead_id IS NOT NULL
    AND ce.status != 'cancelado'
  ORDER BY ce.event_date ASC;
$$;
