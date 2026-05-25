CREATE OR REPLACE FUNCTION public.delete_conversation_cascade(_conversation_id uuid, _delete_lead boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '60s'
AS $$
DECLARE
  _conv RECORD;
  _user uuid := auth.uid();
  _deleted_msgs int := 0;
  _lead_id uuid;
BEGIN
  SELECT id, company_id, lead_id INTO _conv FROM wapi_conversations WHERE id = _conversation_id;
  IF _conv.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'conversation_not_found');
  END IF;

  -- Authorization: user must belong to conversation's company OR be admin
  IF NOT (is_admin(_user) OR _conv.company_id = ANY (get_user_company_ids(_user))) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  _lead_id := _conv.lead_id;

  -- Delete dependents
  DELETE FROM flow_lead_state WHERE conversation_id = _conversation_id;

  WITH d AS (DELETE FROM wapi_messages WHERE conversation_id = _conversation_id RETURNING 1)
  SELECT count(*) INTO _deleted_msgs FROM d;

  DELETE FROM wapi_conversations WHERE id = _conversation_id;

  IF _delete_lead AND _lead_id IS NOT NULL THEN
    DELETE FROM leads WHERE id = _lead_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'deleted_messages', _deleted_msgs, 'lead_deleted', (_delete_lead AND _lead_id IS NOT NULL));
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_conversation_cascade(uuid, boolean) TO authenticated;