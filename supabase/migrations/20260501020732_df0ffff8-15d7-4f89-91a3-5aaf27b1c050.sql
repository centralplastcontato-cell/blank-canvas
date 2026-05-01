-- Limpeza de conversas-fantasma de status@broadcast
-- Bug histórico: webhook capturava eventos de Status do WhatsApp como conversas reais.
-- Filtro defensivo já está ativo no wapi-webhook (linhas 4731-4734).
-- Esta migration apenas remove o lixo histórico.

DO $$
DECLARE
  v_conv_ids uuid[];
  v_msg_count integer;
  v_conv_count integer;
  v_unlinked integer;
BEGIN
  -- Coletar IDs das conversas-fantasma
  SELECT array_agg(id) INTO v_conv_ids
  FROM public.wapi_conversations
  WHERE remote_jid ILIKE '%@broadcast%'
     OR remote_jid ILIKE 'status@%'
     OR contact_phone IN ('status@broadcast', 'status');

  IF v_conv_ids IS NULL OR array_length(v_conv_ids, 1) = 0 THEN
    RAISE NOTICE 'Nenhuma conversa-fantasma encontrada. Nada a fazer.';
    RETURN;
  END IF;

  -- 1. Desvincular lead_id (proteção: nunca apagar leads)
  UPDATE public.wapi_conversations
  SET lead_id = NULL
  WHERE id = ANY(v_conv_ids) AND lead_id IS NOT NULL;
  GET DIAGNOSTICS v_unlinked = ROW_COUNT;

  -- 2. Apagar flow_lead_state órfão dessas conversas
  DELETE FROM public.flow_lead_state
  WHERE conversation_id = ANY(v_conv_ids);

  -- 3. Apagar mensagens
  DELETE FROM public.wapi_messages
  WHERE conversation_id = ANY(v_conv_ids);
  GET DIAGNOSTICS v_msg_count = ROW_COUNT;

  -- 4. Apagar conversas-fantasma
  DELETE FROM public.wapi_conversations
  WHERE id = ANY(v_conv_ids);
  GET DIAGNOSTICS v_conv_count = ROW_COUNT;

  RAISE NOTICE 'Limpeza concluída: % leads desvinculados, % mensagens apagadas, % conversas-fantasma apagadas',
    v_unlinked, v_msg_count, v_conv_count;
END $$;