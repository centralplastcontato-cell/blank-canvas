-- Disable bot on all existing group conversations
UPDATE wapi_conversations 
SET bot_enabled = false, bot_step = NULL 
WHERE remote_jid LIKE '%@g.us%' AND bot_enabled = true;