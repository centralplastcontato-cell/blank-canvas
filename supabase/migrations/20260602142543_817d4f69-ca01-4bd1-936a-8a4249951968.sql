CREATE INDEX IF NOT EXISTS idx_wapi_conversations_instance_id
  ON public.wapi_conversations(instance_id);

CREATE INDEX IF NOT EXISTS idx_wapi_messages_conversation_id
  ON public.wapi_messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_flow_lead_state_conversation_id
  ON public.flow_lead_state(conversation_id);

CREATE OR REPLACE FUNCTION public.delete_wapi_instance_deep(_instance_id uuid, _batch_size integer DEFAULT 500)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '5min'
AS $$
DECLARE
  v_company_id uuid;
  v_unit text;
  v_batch_size integer := LEAST(GREATEST(COALESCE(_batch_size, 500), 50), 1000);
  v_rows integer := 0;
  v_deleted_messages integer := 0;
  v_deleted_flow_state integer := 0;
  v_deleted_conversations integer := 0;
  v_deleted_questions integer := 0;
  v_deleted_settings integer := 0;
  v_deleted_vips integer := 0;
  v_deleted_lid_maps integer := 0;
  v_deleted_instances integer := 0;
BEGIN
  SELECT company_id, unit
  INTO v_company_id, v_unit
  FROM public.wapi_instances
  WHERE id = _instance_id;

  IF v_company_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_deleted', true,
      'message', 'Instância já não existe.'
    );
  END IF;

  IF NOT (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = v_company_id
        AND uc.role IN ('owner', 'admin')
    )
  ) THEN
    RAISE EXCEPTION 'Sem permissão para excluir esta instância.';
  END IF;

  DELETE FROM public.wapi_bot_questions WHERE instance_id = _instance_id;
  GET DIAGNOSTICS v_deleted_questions = ROW_COUNT;

  DELETE FROM public.wapi_bot_settings WHERE instance_id = _instance_id;
  GET DIAGNOSTICS v_deleted_settings = ROW_COUNT;

  DELETE FROM public.wapi_vip_numbers WHERE instance_id = _instance_id;
  GET DIAGNOSTICS v_deleted_vips = ROW_COUNT;

  DELETE FROM public.wapi_lid_phone_map WHERE instance_id = _instance_id;
  GET DIAGNOSTICS v_deleted_lid_maps = ROW_COUNT;

  LOOP
    WITH batch AS (
      SELECT wm.id
      FROM public.wapi_messages wm
      JOIN public.wapi_conversations wc ON wc.id = wm.conversation_id
      WHERE wc.instance_id = _instance_id
      LIMIT v_batch_size
    )
    DELETE FROM public.wapi_messages wm
    USING batch
    WHERE wm.id = batch.id;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_deleted_messages := v_deleted_messages + v_rows;
    EXIT WHEN v_rows = 0;
  END LOOP;

  LOOP
    WITH batch AS (
      SELECT fls.id
      FROM public.flow_lead_state fls
      JOIN public.wapi_conversations wc ON wc.id = fls.conversation_id
      WHERE wc.instance_id = _instance_id
      LIMIT v_batch_size
    )
    DELETE FROM public.flow_lead_state fls
    USING batch
    WHERE fls.id = batch.id;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_deleted_flow_state := v_deleted_flow_state + v_rows;
    EXIT WHEN v_rows = 0;
  END LOOP;

  UPDATE public.lead_reactivation_history lrh
  SET conversation_id = NULL
  WHERE lrh.conversation_id IN (
    SELECT wc.id
    FROM public.wapi_conversations wc
    WHERE wc.instance_id = _instance_id
  );

  LOOP
    WITH batch AS (
      SELECT id
      FROM public.wapi_conversations
      WHERE instance_id = _instance_id
      LIMIT v_batch_size
    )
    DELETE FROM public.wapi_conversations wc
    USING batch
    WHERE wc.id = batch.id;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_deleted_conversations := v_deleted_conversations + v_rows;
    EXIT WHEN v_rows = 0;
  END LOOP;

  DELETE FROM public.wapi_instances WHERE id = _instance_id;
  GET DIAGNOSTICS v_deleted_instances = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'unit', v_unit,
    'deleted_instances', v_deleted_instances,
    'deleted_messages', v_deleted_messages,
    'deleted_flow_state', v_deleted_flow_state,
    'deleted_conversations', v_deleted_conversations,
    'deleted_questions', v_deleted_questions,
    'deleted_settings', v_deleted_settings,
    'deleted_vips', v_deleted_vips,
    'deleted_lid_maps', v_deleted_lid_maps
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_wapi_instance_deep(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_wapi_instance_deep(uuid, integer) TO service_role;