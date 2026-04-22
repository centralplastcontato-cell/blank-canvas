
CREATE OR REPLACE FUNCTION public.submit_client_data_public(_token text, _client_data jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_event_id uuid;
  v_request_id uuid;
  v_company_id uuid;
  v_children jsonb;
  v_first_child jsonb;
  v_birthdate_text text;
BEGIN
  UPDATE public.client_data_requests
  SET client_data = _client_data,
      status = 'completed',
      completed_at = now()
  WHERE token = _token
    AND status IN ('pending', 'sent')
  RETURNING event_id, id, company_id INTO v_event_id, v_request_id, v_company_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Token inválido ou solicitação já processada';
  END IF;

  -- Log de auditoria para preenchimento público
  INSERT INTO public.activity_logs (
    company_id, user_id, user_name, action, module,
    entity_type, entity_id, entity_name, details
  ) VALUES (
    v_company_id,
    NULL,
    'Cliente (público)',
    'create',
    'contracts',
    'client_data',
    v_request_id::text,
    COALESCE(_client_data->>'nome', 'Não informado'),
    jsonb_build_object('source', 'public_form', 'event_id', v_event_id)
  );

  -- Sync birthday_children back to company_events
  v_children := _client_data->'birthday_children';
  IF v_children IS NOT NULL AND jsonb_array_length(v_children) > 0 THEN
    v_first_child := v_children->0;
    v_birthdate_text := v_first_child->>'birthdate';
    
    UPDATE public.company_events
    SET birthday_children = v_children,
        child_name = v_first_child->>'name',
        child_age = v_first_child->>'age',
        child_birthdate = CASE 
          WHEN v_birthdate_text IS NOT NULL AND v_birthdate_text != '' 
          THEN v_birthdate_text::date 
          ELSE NULL 
        END
    WHERE id = v_event_id;
  END IF;
END;
$function$;
