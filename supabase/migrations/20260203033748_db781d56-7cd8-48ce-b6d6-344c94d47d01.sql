-- Add favorite and last message preview columns to wapi_conversations
ALTER TABLE public.wapi_conversations 
ADD COLUMN IF NOT EXISTS is_favorite boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_message_content text,
ADD COLUMN IF NOT EXISTS last_message_from_me boolean DEFAULT false;

-- Create index for faster favorite queries
CREATE INDEX IF NOT EXISTS idx_wapi_conversations_is_favorite 
ON public.wapi_conversations (instance_id, is_favorite) 
WHERE is_favorite = true;

-- Create index for unread queries
CREATE INDEX IF NOT EXISTS idx_wapi_conversations_unread 
ON public.wapi_conversations (instance_id, unread_count) 
WHERE unread_count > 0;