DO $$
DECLARE
  v_dup record;
  v_canonical_id uuid;
  v_moved integer := 0;
  v_deleted integer := 0;
BEGIN
  -- For each (instance_id, normalized_phone) group with more than 1 conversation,
  -- pick the canonical one (preferring one with a lead_id, then most recent activity)
  -- and move all messages from the others into it, then delete the empty ghosts.
  FOR v_dup IN
    WITH normalized AS (
      SELECT
        c.id,
        c.instance_id,
        c.lead_id,
        c.last_message_at,
        c.contact_phone,
        -- Strip leading 55 to group with/without country code together
        regexp_replace(regexp_replace(c.contact_phone, '\D', '', 'g'), '^55', '') AS phone_key
      FROM public.wapi_conversations c
      WHERE c.contact_phone IS NOT NULL
        AND c.contact_phone <> ''
    ),
    grouped AS (
      SELECT instance_id, phone_key, count(*) AS n
      FROM normalized
      WHERE phone_key <> ''
      GROUP BY instance_id, phone_key
      HAVING count(*) > 1
    )
    SELECT g.instance_id, g.phone_key
    FROM grouped g
  LOOP
    -- Pick canonical conversation for this (instance, phone_key):
    -- 1) prefer a row with lead_id set, 2) then prefer a row whose contact_phone starts with 55,
    -- 3) then most recent last_message_at
    SELECT id INTO v_canonical_id
    FROM public.wapi_conversations c
    WHERE c.instance_id = v_dup.instance_id
      AND regexp_replace(regexp_replace(c.contact_phone, '\D', '', 'g'), '^55', '') = v_dup.phone_key
    ORDER BY
      (c.lead_id IS NOT NULL) DESC,
      (regexp_replace(c.contact_phone, '\D', '', 'g') LIKE '55%') DESC,
      COALESCE(c.last_message_at, c.created_at) DESC NULLS LAST
    LIMIT 1;

    IF v_canonical_id IS NULL THEN CONTINUE; END IF;

    -- Move messages from ghost conversations into the canonical one
    WITH ghosts AS (
      SELECT id FROM public.wapi_conversations c
      WHERE c.instance_id = v_dup.instance_id
        AND regexp_replace(regexp_replace(c.contact_phone, '\D', '', 'g'), '^55', '') = v_dup.phone_key
        AND c.id <> v_canonical_id
    ),
    moved AS (
      UPDATE public.wapi_messages m
      SET conversation_id = v_canonical_id
      WHERE m.conversation_id IN (SELECT id FROM ghosts)
      RETURNING 1
    )
    SELECT count(*) INTO v_moved FROM moved;

    -- Move flow_lead_state too (if any)
    UPDATE public.flow_lead_state fls
    SET conversation_id = v_canonical_id
    WHERE fls.conversation_id IN (
      SELECT id FROM public.wapi_conversations c
      WHERE c.instance_id = v_dup.instance_id
        AND regexp_replace(regexp_replace(c.contact_phone, '\D', '', 'g'), '^55', '') = v_dup.phone_key
        AND c.id <> v_canonical_id
    );

    -- Delete the now-empty ghost conversations
    WITH del AS (
      DELETE FROM public.wapi_conversations c
      WHERE c.instance_id = v_dup.instance_id
        AND regexp_replace(regexp_replace(c.contact_phone, '\D', '', 'g'), '^55', '') = v_dup.phone_key
        AND c.id <> v_canonical_id
      RETURNING 1
    )
    SELECT count(*) INTO v_deleted FROM del;

    -- Refresh last_message_* on the canonical from its newest message
    UPDATE public.wapi_conversations c
    SET
      last_message_at = sub.ts,
      last_message_content = LEFT(COALESCE(sub.content, ''), 100),
      last_message_from_me = sub.from_me
    FROM (
      SELECT m.timestamp AS ts, m.content, m.from_me
      FROM public.wapi_messages m
      WHERE m.conversation_id = v_canonical_id
      ORDER BY m.timestamp DESC NULLS LAST
      LIMIT 1
    ) sub
    WHERE c.id = v_canonical_id;

    RAISE NOTICE 'Consolidated phone_key=% on instance=% into canonical=% (moved=% deleted=%)',
      v_dup.phone_key, v_dup.instance_id, v_canonical_id, v_moved, v_deleted;
  END LOOP;
END$$;