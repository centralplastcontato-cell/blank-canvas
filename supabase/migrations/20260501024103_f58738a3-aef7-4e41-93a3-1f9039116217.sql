-- Merge duplicate WhatsApp conversations across instances within the same company.
-- Strategy: pick the conversation with the most recent message as the "winner",
-- migrate all messages from "loser" conversations into it, then delete losers.

DO $$
DECLARE
  v_group RECORD;
  v_winner_id uuid;
  v_loser_ids uuid[];
  v_loser_id uuid;
  v_total_groups int := 0;
  v_total_merged_convs int := 0;
  v_total_moved_msgs bigint := 0;
  v_moved bigint;
  v_winner_lead uuid;
  v_winner_bot_enabled boolean;
  v_winner_bot_step text;
BEGIN
  FOR v_group IN
    WITH norm AS (
      SELECT 
        c.id,
        c.company_id,
        c.instance_id,
        c.remote_jid,
        c.contact_phone,
        c.lead_id,
        c.last_message_at,
        c.bot_enabled,
        c.bot_step,
        regexp_replace(c.contact_phone, '\D', '', 'g') AS digits_raw
      FROM wapi_conversations c
      WHERE c.remote_jid NOT LIKE '%@g.us'
        AND c.remote_jid NOT LIKE '%@broadcast%'
        AND c.remote_jid NOT LIKE 'status@%'
        AND c.remote_jid NOT LIKE '%@lid'
        AND c.contact_phone IS NOT NULL
        AND c.contact_phone <> ''
    ),
    canonical AS (
      SELECT n.*,
        CASE 
          WHEN length(CASE WHEN digits_raw LIKE '55%' AND length(digits_raw)>=12 
                          THEN substring(digits_raw FROM 3) ELSE digits_raw END) = 11
            AND substring(CASE WHEN digits_raw LIKE '55%' AND length(digits_raw)>=12 
                                THEN substring(digits_raw FROM 3) ELSE digits_raw END FROM 3 FOR 1) = '9'
          THEN substring(CASE WHEN digits_raw LIKE '55%' AND length(digits_raw)>=12 
                              THEN substring(digits_raw FROM 3) ELSE digits_raw END FROM 1 FOR 2)
            || substring(CASE WHEN digits_raw LIKE '55%' AND length(digits_raw)>=12 
                              THEN substring(digits_raw FROM 3) ELSE digits_raw END FROM 4)
          ELSE CASE WHEN digits_raw LIKE '55%' AND length(digits_raw)>=12 
                    THEN substring(digits_raw FROM 3) ELSE digits_raw END
        END AS canon
      FROM norm n
    ),
    grouped AS (
      SELECT 
        company_id,
        canon,
        array_agg(id ORDER BY last_message_at DESC NULLS LAST, id) AS conv_ids,
        array_agg(lead_id ORDER BY last_message_at DESC NULLS LAST, id) AS lead_ids,
        array_agg(bot_enabled ORDER BY last_message_at DESC NULLS LAST, id) AS bot_enableds,
        array_agg(bot_step ORDER BY last_message_at DESC NULLS LAST, id) AS bot_steps,
        count(*) AS dup_count,
        count(DISTINCT instance_id) AS inst_count
      FROM canonical
      WHERE canon <> ''
      GROUP BY company_id, canon
    )
    SELECT * FROM grouped
    WHERE dup_count > 1 AND inst_count > 1
  LOOP
    v_total_groups := v_total_groups + 1;
    v_winner_id := v_group.conv_ids[1];
    v_loser_ids := v_group.conv_ids[2:array_length(v_group.conv_ids,1)];

    -- Resolve a lead_id for the winner: prefer winner's, else any non-null loser
    SELECT lead_id INTO v_winner_lead FROM wapi_conversations WHERE id = v_winner_id;
    IF v_winner_lead IS NULL THEN
      SELECT lead_id INTO v_winner_lead 
      FROM wapi_conversations 
      WHERE id = ANY(v_loser_ids) AND lead_id IS NOT NULL 
      LIMIT 1;
    END IF;

    -- Resolve bot state: keep winner's if it has a meaningful step, else inherit
    SELECT bot_enabled, bot_step INTO v_winner_bot_enabled, v_winner_bot_step
    FROM wapi_conversations WHERE id = v_winner_id;
    IF v_winner_bot_step IS NULL OR v_winner_bot_step = 'welcome' THEN
      SELECT bot_enabled, bot_step INTO v_winner_bot_enabled, v_winner_bot_step
      FROM wapi_conversations 
      WHERE id = ANY(v_loser_ids) 
        AND bot_step IS NOT NULL 
        AND bot_step <> 'welcome'
      ORDER BY last_message_at DESC NULLS LAST
      LIMIT 1;
    END IF;

    FOREACH v_loser_id IN ARRAY v_loser_ids
    LOOP
      -- Move messages: avoid duplicate-key collisions on (conversation_id, message_id)
      -- by skipping messages whose message_id already exists on the winner.
      WITH moved AS (
        UPDATE wapi_messages m
        SET conversation_id = v_winner_id
        WHERE m.conversation_id = v_loser_id
          AND NOT EXISTS (
            SELECT 1 FROM wapi_messages w
            WHERE w.conversation_id = v_winner_id
              AND w.message_id = m.message_id
          )
        RETURNING 1
      )
      SELECT count(*) INTO v_moved FROM moved;
      v_total_moved_msgs := v_total_moved_msgs + COALESCE(v_moved, 0);

      -- Delete remaining (collision) messages on loser
      DELETE FROM wapi_messages WHERE conversation_id = v_loser_id;

      -- Move flow_lead_state if loser has one and winner doesn't
      UPDATE flow_lead_state
      SET conversation_id = v_winner_id
      WHERE conversation_id = v_loser_id
        AND NOT EXISTS (SELECT 1 FROM flow_lead_state WHERE conversation_id = v_winner_id);

      DELETE FROM flow_lead_state WHERE conversation_id = v_loser_id;

      -- Delete the loser conversation
      DELETE FROM wapi_conversations WHERE id = v_loser_id;
      v_total_merged_convs := v_total_merged_convs + 1;
    END LOOP;

    -- Update winner with consolidated lead/bot state
    UPDATE wapi_conversations
    SET 
      lead_id = COALESCE(lead_id, v_winner_lead),
      bot_enabled = COALESCE(v_winner_bot_enabled, bot_enabled),
      bot_step = COALESCE(v_winner_bot_step, bot_step)
    WHERE id = v_winner_id;
  END LOOP;

  RAISE NOTICE 'Cross-instance dedup complete: % groups processed, % loser conversations merged, % messages moved',
    v_total_groups, v_total_merged_convs, v_total_moved_msgs;
END $$;