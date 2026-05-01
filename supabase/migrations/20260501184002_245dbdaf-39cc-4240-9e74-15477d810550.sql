CREATE OR REPLACE FUNCTION public.merge_duplicate_conversations_intra_instance()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_pair record; v_winner_id uuid; v_loser_id uuid; v_winner record; v_loser record;
  v_total_pairs int := 0; v_total_messages_moved int := 0; v_msgs_moved int;
BEGIN
  FOR v_pair IN
    WITH normalized AS (
      SELECT id, company_id, instance_id, remote_jid, contact_phone, created_at,
        regexp_replace(COALESCE(contact_phone, split_part(remote_jid, '@', 1)), '[^0-9]', '', 'g') AS digits_raw
      FROM wapi_conversations WHERE remote_jid NOT LIKE '%@g.us'
    ),
    filtered AS (SELECT * FROM normalized WHERE length(digits_raw) BETWEEN 10 AND 13),
    canonical AS (
      SELECT *,
        CASE 
          WHEN length(digits_raw) = 13 AND substring(digits_raw FROM 1 FOR 2) = '55' AND substring(digits_raw FROM 5 FOR 1) = '9'
            THEN substring(digits_raw FROM 1 FOR 4) || substring(digits_raw FROM 6)
          WHEN length(digits_raw) = 12 AND substring(digits_raw FROM 1 FOR 2) = '55' THEN digits_raw
          WHEN length(digits_raw) = 11 AND substring(digits_raw FROM 3 FOR 1) = '9'
            THEN '55' || substring(digits_raw FROM 1 FOR 2) || substring(digits_raw FROM 4)
          WHEN length(digits_raw) = 10 THEN '55' || digits_raw
          ELSE '55' || digits_raw 
        END AS canon_phone
      FROM filtered
    )
    SELECT company_id, instance_id, canon_phone, array_agg(id ORDER BY created_at) AS ids
    FROM canonical GROUP BY company_id, instance_id, canon_phone HAVING count(*) > 1
  LOOP
    v_winner_id := v_pair.ids[1];
    SELECT * INTO v_winner FROM wapi_conversations WHERE id = v_winner_id;
    IF NOT FOUND THEN CONTINUE; END IF;
    FOR i IN 2..array_length(v_pair.ids, 1) LOOP
      v_loser_id := v_pair.ids[i];
      SELECT * INTO v_loser FROM wapi_conversations WHERE id = v_loser_id;
      IF NOT FOUND THEN CONTINUE; END IF;
      UPDATE wapi_messages SET conversation_id = v_winner_id WHERE conversation_id = v_loser_id;
      GET DIAGNOSTICS v_msgs_moved = ROW_COUNT;
      v_total_messages_moved := v_total_messages_moved + v_msgs_moved;
      UPDATE flow_lead_state SET conversation_id = v_winner_id 
      WHERE conversation_id = v_loser_id
        AND NOT EXISTS (SELECT 1 FROM flow_lead_state WHERE conversation_id = v_winner_id);
      DELETE FROM flow_lead_state WHERE conversation_id = v_loser_id;
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
        bot_step = CASE WHEN v_loser.last_message_at > COALESCE(v_winner.last_message_at, '1970-01-01'::timestamptz)
          THEN v_loser.bot_step ELSE v_winner.bot_step END,
        bot_enabled = v_winner.bot_enabled AND v_loser.bot_enabled,
        last_message_at = GREATEST(COALESCE(v_winner.last_message_at, '1970-01-01'::timestamptz), COALESCE(v_loser.last_message_at, '1970-01-01'::timestamptz)),
        last_message_content = CASE WHEN v_loser.last_message_at > COALESCE(v_winner.last_message_at, '1970-01-01'::timestamptz)
          THEN v_loser.last_message_content ELSE v_winner.last_message_content END,
        last_message_from_me = CASE WHEN v_loser.last_message_at > COALESCE(v_winner.last_message_at, '1970-01-01'::timestamptz)
          THEN v_loser.last_message_from_me ELSE v_winner.last_message_from_me END,
        unread_count = COALESCE(v_winner.unread_count, 0) + COALESCE(v_loser.unread_count, 0),
        is_favorite = v_winner.is_favorite OR v_loser.is_favorite,
        is_equipe = v_winner.is_equipe OR v_loser.is_equipe,
        is_freelancer = v_winner.is_freelancer OR v_loser.is_freelancer,
        has_scheduled_visit = v_winner.has_scheduled_visit OR v_loser.has_scheduled_visit,
        updated_at = now()
      WHERE id = v_winner_id;
      SELECT * INTO v_winner FROM wapi_conversations WHERE id = v_winner_id;
      DELETE FROM wapi_conversations WHERE id = v_loser_id;
      v_total_pairs := v_total_pairs + 1;
    END LOOP;
  END LOOP;
  RETURN jsonb_build_object('pairs_merged', v_total_pairs, 'messages_moved', v_total_messages_moved);
END $fn$;

SELECT public.merge_duplicate_conversations_intra_instance();