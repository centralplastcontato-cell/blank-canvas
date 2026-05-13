CREATE OR REPLACE FUNCTION public.get_lead_duplicates_in_hub(_phone text, _company_id uuid)
RETURNS TABLE(company_id uuid, company_name text, lead_id uuid, status text, last_message_at timestamptz, lead_created_at timestamptz)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent uuid;
  v_digits text;
  v_variants text[];
BEGIN
  IF _phone IS NULL OR _company_id IS NULL THEN RETURN; END IF;

  SELECT parent_id INTO v_parent FROM public.companies WHERE id = _company_id;
  IF v_parent IS NULL THEN RETURN; END IF;

  v_digits := regexp_replace(_phone, '[^0-9]', '', 'g');
  IF length(v_digits) < 10 THEN RETURN; END IF;

  -- Build phone variants (with/without 55 prefix, with/without 9)
  v_variants := ARRAY[v_digits];
  IF left(v_digits, 2) = '55' THEN
    v_variants := v_variants || substring(v_digits FROM 3);
  ELSE
    v_variants := v_variants || ('55' || v_digits);
  END IF;

  RETURN QUERY
  SELECT s.id, s.name, l.id, l.status::text, conv.last_message_at, l.created_at
  FROM public.companies s
  JOIN public.campaign_leads l ON l.company_id = s.id AND l.whatsapp = ANY(v_variants)
  LEFT JOIN LATERAL (
    SELECT wc.last_message_at FROM public.wapi_conversations wc
    WHERE wc.lead_id = l.id ORDER BY wc.last_message_at DESC NULLS LAST LIMIT 1
  ) conv ON true
  WHERE s.parent_id = v_parent AND s.id <> _company_id AND s.is_active = true
  ORDER BY conv.last_message_at DESC NULLS LAST;
END;
$$;