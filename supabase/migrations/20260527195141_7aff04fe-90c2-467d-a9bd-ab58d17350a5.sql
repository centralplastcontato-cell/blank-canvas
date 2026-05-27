
-- Backfill: para cada mapping existente, executa merge se houver par (@lid + real) na mesma instância
DO $$
DECLARE
  v_map record;
  v_lid_conv_id uuid;
  v_real_conv_id uuid;
  v_result jsonb;
  v_count int := 0;
BEGIN
  FOR v_map IN
    SELECT lid_digits, phone_digits, instance_id
    FROM public.wapi_lid_phone_map
    WHERE lid_digits IS NOT NULL AND phone_digits IS NOT NULL AND instance_id IS NOT NULL
  LOOP
    SELECT id INTO v_lid_conv_id
    FROM public.wapi_conversations
    WHERE instance_id = v_map.instance_id
      AND remote_jid = v_map.lid_digits || '@lid'
    LIMIT 1;

    IF v_lid_conv_id IS NULL THEN CONTINUE; END IF;

    SELECT id INTO v_real_conv_id
    FROM public.wapi_conversations
    WHERE instance_id = v_map.instance_id
      AND remote_jid NOT LIKE '%@lid'
      AND regexp_replace(remote_jid, '\D', '', 'g') = v_map.phone_digits
    ORDER BY last_message_at DESC NULLS LAST
    LIMIT 1;

    IF v_real_conv_id IS NULL THEN CONTINUE; END IF;

    v_result := public.merge_lid_into_real_conversation(v_lid_conv_id, v_real_conv_id);
    RAISE NOTICE 'Backfill merge: %', v_result;
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Total backfill merges: %', v_count;
END $$;
