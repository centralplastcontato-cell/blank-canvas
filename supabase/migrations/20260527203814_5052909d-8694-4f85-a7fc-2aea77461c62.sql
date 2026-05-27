
-- Merge orphan @lid conversation 4f47c9e0 into Rosa Amorim main conversation b1a57f53
-- Move 22 outbound messages (avoiding duplicates by message_id)
UPDATE public.wapi_messages
SET conversation_id = 'b1a57f53-c51c-4e44-93e2-1b7bfd3bc34d'
WHERE conversation_id = '4f47c9e0-04eb-480d-855d-7deb8b355357'
  AND message_id NOT IN (
    SELECT message_id FROM public.wapi_messages
    WHERE conversation_id = 'b1a57f53-c51c-4e44-93e2-1b7bfd3bc34d'
      AND message_id IS NOT NULL
  );

-- Delete any leftover duplicates still in orphan
DELETE FROM public.wapi_messages WHERE conversation_id = '4f47c9e0-04eb-480d-855d-7deb8b355357';

-- Delete orphan conversation
DELETE FROM public.wapi_conversations WHERE id = '4f47c9e0-04eb-480d-855d-7deb8b355357';

-- Fix the LID mapping to point to the correct phone (with the 9 of celular)
UPDATE public.wapi_lid_phone_map
SET phone_digits = '5535988683291'
WHERE lid_digits = '232259047174161' AND phone_digits = '553588683291';

-- Refresh last_message_at on main conversation
UPDATE public.wapi_conversations
SET last_message_at = (SELECT MAX(timestamp) FROM public.wapi_messages WHERE conversation_id = 'b1a57f53-c51c-4e44-93e2-1b7bfd3bc34d')
WHERE id = 'b1a57f53-c51c-4e44-93e2-1b7bfd3bc34d';
