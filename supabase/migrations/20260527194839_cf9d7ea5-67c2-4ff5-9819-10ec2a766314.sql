
DROP FUNCTION IF EXISTS public.merge_lid_into_real_conversation(uuid, uuid);

CREATE OR REPLACE FUNCTION public.merge_lid_into_real_conversation(
  p_lid_conv_id uuid,
  p_real_conv_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lid record;
  v_real record;
  v_msgs_moved int := 0;
  v_dups_removed int := 0;
BEGIN
  IF p_lid_conv_id IS NULL OR p_real_conv_id IS NULL OR p_lid_conv_id = p_real_conv_id THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'invalid_ids');
  END IF;

  SELECT * INTO v_lid  FROM wapi_conversations WHERE id = p_lid_conv_id;
  SELECT * INTO v_real FROM wapi_conversations WHERE id = p_real_conv_id;

  IF v_lid IS NULL OR v_real IS NULL THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'conversation_not_found');
  END IF;

  IF v_lid.instance_id IS DISTINCT FROM v_real.instance_id THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'different_instances');
  END IF;

  DELETE FROM wapi_messages lm
  WHERE lm.conversation_id = p_lid_conv_id
    AND EXISTS (
      SELECT 1 FROM wapi_messages rm
      WHERE rm.conversation_id = p_real_conv_id
        AND rm.message_id = lm.message_id
    );
  GET DIAGNOSTICS v_dups_removed = ROW_COUNT;

  UPDATE wapi_messages
  SET conversation_id = p_real_conv_id
  WHERE conversation_id = p_lid_conv_id;
  GET DIAGNOSTICS v_msgs_moved = ROW_COUNT;

  UPDATE flow_lead_state
  SET conversation_id = p_real_conv_id
  WHERE conversation_id = p_lid_conv_id
    AND NOT EXISTS (SELECT 1 FROM flow_lead_state WHERE conversation_id = p_real_conv_id);
  DELETE FROM flow_lead_state WHERE conversation_id = p_lid_conv_id;

  UPDATE wapi_conversations SET
    lead_id              = COALESCE(lead_id, v_lid.lead_id),
    contact_name         = COALESCE(NULLIF(contact_name,''), v_lid.contact_name),
    contact_picture      = COALESCE(contact_picture, v_lid.contact_picture),
    unread_count         = COALESCE(unread_count,0) + COALESCE(v_lid.unread_count,0),
    is_favorite          = COALESCE(is_favorite,false)         OR COALESCE(v_lid.is_favorite,false),
    is_equipe            = COALESCE(is_equipe,false)           OR COALESCE(v_lid.is_equipe,false),
    is_freelancer        = COALESCE(is_freelancer,false)       OR COALESCE(v_lid.is_freelancer,false),
    has_scheduled_visit  = COALESCE(has_scheduled_visit,false) OR COALESCE(v_lid.has_scheduled_visit,false),
    last_message_at      = GREATEST(COALESCE(last_message_at,'epoch'::timestamptz), COALESCE(v_lid.last_message_at,'epoch'::timestamptz)),
    last_message_content = CASE
      WHEN COALESCE(v_lid.last_message_at,'epoch'::timestamptz) > COALESCE(last_message_at,'epoch'::timestamptz)
      THEN v_lid.last_message_content ELSE last_message_content END,
    last_message_from_me = CASE
      WHEN COALESCE(v_lid.last_message_at,'epoch'::timestamptz) > COALESCE(last_message_at,'epoch'::timestamptz)
      THEN v_lid.last_message_from_me ELSE last_message_from_me END,
    updated_at = now()
  WHERE id = p_real_conv_id;

  DELETE FROM wapi_conversations WHERE id = p_lid_conv_id;

  RETURN jsonb_build_object(
    'merged', true,
    'messages_moved', v_msgs_moved,
    'duplicates_removed', v_dups_removed,
    'lid_conv_id', p_lid_conv_id,
    'real_conv_id', p_real_conv_id
  );
END $$;

CREATE OR REPLACE FUNCTION public.fn_auto_merge_lid_on_mapping()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lid_conv_id uuid;
  v_real_conv_id uuid;
  v_result jsonb;
BEGIN
  IF NEW.lid_digits IS NULL OR NEW.phone_digits IS NULL OR NEW.instance_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_lid_conv_id
  FROM wapi_conversations
  WHERE instance_id = NEW.instance_id
    AND remote_jid = NEW.lid_digits || '@lid'
  LIMIT 1;

  IF v_lid_conv_id IS NULL THEN RETURN NEW; END IF;

  SELECT id INTO v_real_conv_id
  FROM wapi_conversations
  WHERE instance_id = NEW.instance_id
    AND remote_jid NOT LIKE '%@lid'
    AND regexp_replace(remote_jid, '\D', '', 'g') = NEW.phone_digits
  ORDER BY last_message_at DESC NULLS LAST
  LIMIT 1;

  IF v_real_conv_id IS NULL THEN RETURN NEW; END IF;

  v_result := public.merge_lid_into_real_conversation(v_lid_conv_id, v_real_conv_id);
  RAISE NOTICE '[auto_merge_lid] %', v_result;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_auto_merge_lid_on_mapping ON public.wapi_lid_phone_map;
CREATE TRIGGER trg_auto_merge_lid_on_mapping
AFTER INSERT OR UPDATE ON public.wapi_lid_phone_map
FOR EACH ROW
EXECUTE FUNCTION public.fn_auto_merge_lid_on_mapping();
