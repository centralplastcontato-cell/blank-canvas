-- Fix messages with NULL company_id by inheriting from their conversation
UPDATE wapi_messages m
SET company_id = c.company_id
FROM wapi_conversations c
WHERE m.conversation_id = c.id
  AND m.company_id IS NULL
  AND c.company_id IS NOT NULL;