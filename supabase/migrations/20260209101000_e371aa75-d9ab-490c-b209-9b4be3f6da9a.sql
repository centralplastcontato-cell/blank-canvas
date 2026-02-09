-- Add is_imported field to track imported conversations
ALTER TABLE wapi_conversations
ADD COLUMN is_imported boolean NOT NULL DEFAULT false;

-- Mark existing conversations that were imported (those without any messages created by webhook)
-- Conversations that have no messages with message_id (webhook-created messages have message_id)
-- are likely imported, but we'll default to false and let the import system mark them

-- Add index for efficient filtering
CREATE INDEX idx_wapi_conversations_is_imported ON wapi_conversations(is_imported) WHERE is_imported = true;