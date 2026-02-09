-- Step 1: Move all messages from duplicate conversations to the original (oldest) one
WITH duplicates AS (
  SELECT id, remote_jid, instance_id, created_at,
    FIRST_VALUE(id) OVER (PARTITION BY instance_id, remote_jid ORDER BY created_at ASC) as original_id,
    ROW_NUMBER() OVER (PARTITION BY instance_id, remote_jid ORDER BY created_at ASC) as rn
  FROM wapi_conversations
)
UPDATE wapi_messages m
SET conversation_id = d.original_id
FROM duplicates d
WHERE m.conversation_id = d.id AND d.rn > 1;

-- Step 2: Delete duplicate conversations (keeping the oldest)
WITH duplicates AS (
  SELECT id, remote_jid, instance_id,
    ROW_NUMBER() OVER (PARTITION BY instance_id, remote_jid ORDER BY created_at ASC) as rn
  FROM wapi_conversations
)
DELETE FROM wapi_conversations
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- Step 3: Add unique constraint to prevent future duplicates
ALTER TABLE wapi_conversations
ADD CONSTRAINT wapi_conversations_instance_remote_unique 
UNIQUE (instance_id, remote_jid);