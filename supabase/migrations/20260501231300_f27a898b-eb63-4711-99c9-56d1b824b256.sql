-- Função para mesclar conversas LID com a conversa real (mesmo cliente, mesma instância)
-- Reaproveita a lógica de merge_duplicate_conversations_intra_instance
CREATE OR REPLACE FUNCTION public.merge_lid_into_real_conversation(
  _winner_id uuid,  -- conversa real (com telefone correto)
  _loser_id uuid    -- conversa LID (fantasma)
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_winner record;
  v_loser record;
  v_msgs_moved int;
BEGIN
  SELECT * INTO v_winner FROM wapi_conversations WHERE id = _winner_id;
  SELECT * INTO v_loser FROM wapi_conversations WHERE id = _loser_id;

  IF v_winner IS NULL OR v_loser IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Conversa não encontrada');
  END IF;

  IF v_winner.company_id != v_loser.company_id OR v_winner.instance_id != v_loser.instance_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Empresa/instância diferentes');
  END IF;

  -- Mover mensagens
  UPDATE wapi_messages SET conversation_id = _winner_id WHERE conversation_id = _loser_id;
  GET DIAGNOSTICS v_msgs_moved = ROW_COUNT;

  -- Mover flow_lead_state se vencedor não tiver
  UPDATE flow_lead_state SET conversation_id = _winner_id
  WHERE conversation_id = _loser_id
    AND NOT EXISTS (SELECT 1 FROM flow_lead_state WHERE conversation_id = _winner_id);
  DELETE FROM flow_lead_state WHERE conversation_id = _loser_id;

  -- Atualizar metadados do vencedor (preservando dados do CRM e bot)
  UPDATE wapi_conversations SET
    lead_id = COALESCE(v_winner.lead_id, v_loser.lead_id),
    contact_name = CASE
      WHEN v_loser.contact_name IS NOT NULL
        AND length(COALESCE(v_loser.contact_name, '')) > length(COALESCE(v_winner.contact_name, ''))
        AND v_loser.contact_name !~ '^[0-9]+$'
      THEN v_loser.contact_name ELSE v_winner.contact_name END,
    contact_picture = COALESCE(v_winner.contact_picture, v_loser.contact_picture),
    bot_data = CASE
      WHEN v_loser.bot_data IS NOT NULL AND v_winner.bot_data IS NULL THEN v_loser.bot_data
      WHEN v_loser.bot_data IS NOT NULL AND v_loser.last_message_at > COALESCE(v_winner.last_message_at, '1970-01-01'::timestamptz)
      THEN v_loser.bot_data ELSE v_winner.bot_data END,
    bot_step = CASE
      WHEN v_loser.last_message_at > COALESCE(v_winner.last_message_at, '1970-01-01'::timestamptz)
      THEN v_loser.bot_step ELSE v_winner.bot_step END,
    bot_enabled = v_winner.bot_enabled AND v_loser.bot_enabled,
    last_message_at = GREATEST(
      COALESCE(v_winner.last_message_at, '1970-01-01'::timestamptz),
      COALESCE(v_loser.last_message_at, '1970-01-01'::timestamptz)
    ),
    last_message_content = CASE
      WHEN v_loser.last_message_at > COALESCE(v_winner.last_message_at, '1970-01-01'::timestamptz)
      THEN v_loser.last_message_content ELSE v_winner.last_message_content END,
    last_message_from_me = CASE
      WHEN v_loser.last_message_at > COALESCE(v_winner.last_message_at, '1970-01-01'::timestamptz)
      THEN v_loser.last_message_from_me ELSE v_winner.last_message_from_me END,
    unread_count = COALESCE(v_winner.unread_count, 0) + COALESCE(v_loser.unread_count, 0),
    is_favorite = v_winner.is_favorite OR v_loser.is_favorite,
    is_equipe = v_winner.is_equipe OR v_loser.is_equipe,
    is_freelancer = v_winner.is_freelancer OR v_loser.is_freelancer,
    has_scheduled_visit = v_winner.has_scheduled_visit OR v_loser.has_scheduled_visit,
    updated_at = now()
  WHERE id = _winner_id;

  -- Apagar a conversa LID
  DELETE FROM wapi_conversations WHERE id = _loser_id;

  RETURN jsonb_build_object(
    'success', true,
    'messages_moved', v_msgs_moved,
    'winner_id', _winner_id,
    'loser_id', _loser_id
  );
END;
$$;

-- Resolver imediatamente os 3 casos da Alessandra Ali (Mega Magic)
-- Original: 87b197a2-ea4b-44b9-a77c-abe4c886114f (5511997971114)
-- Fantasma 1: 80bd3b00-7fef-4a59-a7de-ecfab8c1188d (142124897067159@lid)
-- Fantasma 2: e4f94385-a1ac-44ea-87ee-48bf815bbd2f (123282858758364@lid)
SELECT public.merge_lid_into_real_conversation(
  '87b197a2-ea4b-44b9-a77c-abe4c886114f'::uuid,
  '80bd3b00-7fef-4a59-a7de-ecfab8c1188d'::uuid
);

SELECT public.merge_lid_into_real_conversation(
  '87b197a2-ea4b-44b9-a77c-abe4c886114f'::uuid,
  'e4f94385-a1ac-44ea-87ee-48bf815bbd2f'::uuid
);