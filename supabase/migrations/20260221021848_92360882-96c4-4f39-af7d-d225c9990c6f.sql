-- Add quoted_message_id to support reply/quote feature
ALTER TABLE public.wapi_messages 
ADD COLUMN IF NOT EXISTS quoted_message_id uuid REFERENCES public.wapi_messages(id) ON DELETE SET NULL;

-- Add is_starred to support favorite/star messages
ALTER TABLE public.wapi_messages
ADD COLUMN IF NOT EXISTS is_starred boolean NOT NULL DEFAULT false;

-- Index for starred messages lookup
CREATE INDEX IF NOT EXISTS idx_wapi_messages_starred 
ON public.wapi_messages (conversation_id, is_starred) 
WHERE is_starred = true;