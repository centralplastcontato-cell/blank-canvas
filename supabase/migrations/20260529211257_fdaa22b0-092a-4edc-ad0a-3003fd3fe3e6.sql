CREATE OR REPLACE FUNCTION public.update_lead_contact_phone(
  _conversation_id uuid,
  _new_phone text,
  _lead_id uuid DEFAULT NULL,
  _user_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '60s'
AS $$
DECLARE
  _user uuid := auth.uid();
  _source public.wapi_conversations%ROWTYPE;
  _target public.wapi_conversations%ROWTYPE;
  _effective_lead_id uuid;
  _lead RECORD;
  _duplicate_lead RECORD;
  _old_phone text;
  _new_digits text;
  _new_jid text;
  _moved_messages integer := 0;
  _merged boolean := false;
BEGIN
  SELECT * INTO _source
  FROM public.wapi_conversations
  WHERE id = _conversation_id;

  IF _source.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'conversation_not_found');
  END IF;

  IF NOT (public.is_admin(_user) OR _source.company_id = ANY(public.get_user_company_ids(_user))) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  _new_digits := regexp_replace(coalesce(_new_phone, ''), '\D', '', 'g');
  IF length(_new_digits) < 10 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_phone');
  END IF;

  _new_jid := _new_digits || '@s.whatsapp.net';
  _old_phone := regexp_replace(coalesce(_source.contact_phone, ''), '\D', '', 'g');
  _effective_lead_id := coalesce(_lead_id, _source.lead_id);

  IF _effective_lead_id IS NOT NULL THEN
    SELECT id, name, whatsapp, company_id INTO _lead
    FROM public.campaign_leads
    WHERE id = _effective_lead_id;

    IF _lead.id IS NULL OR _lead.company_id <> _source.company_id THEN
      RETURN jsonb_build_object('ok', false, 'error', 'lead_not_found');
    END IF;
  END IF;

  IF _new_digits = _old_phone AND _source.remote_jid = _new_jid THEN
    RETURN jsonb_build_object(
      'ok', true,
      'changed', false,
      'merged', false,
      'conversation_id', _source.id,
      'phone', _new_digits
    );
  END IF;

  IF _effective_lead_id IS NOT NULL THEN
    SELECT id, name INTO _duplicate_lead
    FROM public.campaign_leads
    WHERE company_id = _source.company_id
      AND regexp_replace(coalesce(whatsapp, ''), '\D', '', 'g') = _new_digits
      AND id <> _effective_lead_id
    LIMIT 1;

    IF _duplicate_lead.id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'ok', false,
        'error', 'lead_phone_exists',
        'lead_id', _duplicate_lead.id,
        'lead_name', _duplicate_lead.name
      );
    END IF;
  END IF;

  SELECT * INTO _target
  FROM public.wapi_conversations
  WHERE instance_id = _source.instance_id
    AND remote_jid = _new_jid
    AND id <> _source.id
  ORDER BY created_at ASC
  LIMIT 1;

  IF _target.id IS NOT NULL THEN
    IF _effective_lead_id IS NOT NULL
       AND _target.lead_id IS NOT NULL
       AND _target.lead_id <> _effective_lead_id THEN
      RETURN jsonb_build_object('ok', false, 'error', 'conversation_has_other_lead');
    END IF;

    UPDATE public.wapi_messages
    SET conversation_id = _target.id,
        company_id = coalesce(company_id, _source.company_id)
    WHERE conversation_id = _source.id;
    GET DIAGNOSTICS _moved_messages = ROW_COUNT;

    UPDATE public.flow_lead_state fls
    SET conversation_id = _target.id
    WHERE fls.conversation_id = _source.id
      AND NOT EXISTS (
        SELECT 1
        FROM public.flow_lead_state existing
        WHERE existing.conversation_id = _target.id
          AND existing.flow_id = fls.flow_id
      );

    DELETE FROM public.flow_lead_state
    WHERE conversation_id = _source.id;

    UPDATE public.lead_reactivation_history
    SET conversation_id = _target.id
    WHERE conversation_id = _source.id;

    UPDATE public.wapi_conversations
    SET contact_phone = _new_digits,
        remote_jid = _new_jid,
        contact_name = coalesce(contact_name, _source.contact_name),
        lead_id = coalesce(lead_id, _effective_lead_id, _source.lead_id),
        unread_count = coalesce(unread_count, 0) + coalesce(_source.unread_count, 0),
        last_message_at = greatest(coalesce(last_message_at, '-infinity'::timestamptz), coalesce(_source.last_message_at, '-infinity'::timestamptz)),
        updated_at = now()
    WHERE id = _target.id;

    DELETE FROM public.wapi_conversations
    WHERE id = _source.id;

    _merged := true;
  ELSE
    UPDATE public.wapi_conversations
    SET contact_phone = _new_digits,
        remote_jid = _new_jid,
        lead_id = coalesce(lead_id, _effective_lead_id),
        updated_at = now()
    WHERE id = _source.id;
  END IF;

  IF _effective_lead_id IS NOT NULL THEN
    UPDATE public.campaign_leads
    SET whatsapp = _new_digits
    WHERE id = _effective_lead_id;

    INSERT INTO public.lead_history (
      lead_id,
      company_id,
      user_id,
      user_name,
      action,
      old_value,
      new_value
    ) VALUES (
      _effective_lead_id,
      _source.company_id,
      _user,
      coalesce(_user_name, 'Sistema'),
      'Alteração de telefone',
      coalesce(nullif(_old_phone, ''), _lead.whatsapp),
      _new_digits
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'changed', true,
    'merged', _merged,
    'conversation_id', CASE WHEN _merged THEN _target.id ELSE _source.id END,
    'removed_conversation_id', CASE WHEN _merged THEN _source.id ELSE NULL END,
    'moved_messages', _moved_messages,
    'phone', _new_digits
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_lead_contact_phone(uuid, text, uuid, text) TO authenticated;