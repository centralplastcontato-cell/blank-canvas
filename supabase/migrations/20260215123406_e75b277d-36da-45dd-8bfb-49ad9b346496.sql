-- Fix orphaned automated messages that were inserted without company_id
UPDATE wapi_messages m
SET company_id = c.company_id
FROM wapi_conversations c
WHERE m.conversation_id = c.id
  AND m.company_id IS NULL
  AND m.metadata IS NOT NULL
  AND m.metadata::text != 'null';