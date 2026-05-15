INSERT INTO public.wapi_messages (
  conversation_id,
  message_id,
  message_type,
  content,
  from_me,
  status,
  timestamp,
  company_id,
  metadata
)
SELECT
  c.id AS conversation_id,
  'recovered_sidebar_' || c.id::text || '_' || floor(extract(epoch from c.last_message_at))::text AS message_id,
  CASE
    WHEN COALESCE(c.last_message_content, '') ILIKE '%áudio%' OR COALESCE(c.last_message_content, '') ILIKE '%audio%' THEN 'audio'
    WHEN COALESCE(c.last_message_content, '') ILIKE '%imagem%' OR COALESCE(c.last_message_content, '') LIKE '📷%' THEN 'image'
    WHEN COALESCE(c.last_message_content, '') ILIKE '%vídeo%' OR COALESCE(c.last_message_content, '') ILIKE '%video%' OR COALESCE(c.last_message_content, '') LIKE '🎥%' OR COALESCE(c.last_message_content, '') LIKE '🎬%' THEN 'video'
    WHEN COALESCE(c.last_message_content, '') ILIKE '%documento%' OR COALESCE(c.last_message_content, '') LIKE '📄%' THEN 'document'
    WHEN COALESCE(c.last_message_content, '') ILIKE '%contato%' OR COALESCE(c.last_message_content, '') LIKE '👤%' THEN 'contact'
    ELSE 'text'
  END AS message_type,
  NULLIF(c.last_message_content, '') AS content,
  COALESCE(c.last_message_from_me, false) AS from_me,
  CASE WHEN COALESCE(c.last_message_from_me, false) THEN 'sent' ELSE 'received' END AS status,
  c.last_message_at AS timestamp,
  c.company_id,
  jsonb_build_object(
    'source', 'sidebar_recovery',
    'reason', 'conversation_last_message_without_wapi_message',
    'recovered_at', now()
  ) AS metadata
FROM public.wapi_conversations c
LEFT JOIN LATERAL (
  SELECT MAX(m.timestamp) AS latest_saved_at
  FROM public.wapi_messages m
  WHERE m.conversation_id = c.id
) latest ON true
WHERE c.last_message_at IS NOT NULL
  AND NULLIF(c.last_message_content, '') IS NOT NULL
  AND c.last_message_at >= now() - interval '30 days'
  AND (
    latest.latest_saved_at IS NULL
    OR c.last_message_at > latest.latest_saved_at + interval '30 seconds'
  )
ON CONFLICT ON CONSTRAINT wapi_messages_conv_msg_unique DO NOTHING;