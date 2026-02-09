
-- Fix 11 orphaned messages: set company_id from their parent conversation
UPDATE wapi_messages m
SET company_id = c.company_id
FROM wapi_conversations c
WHERE m.conversation_id = c.id
AND m.company_id IS NULL;
