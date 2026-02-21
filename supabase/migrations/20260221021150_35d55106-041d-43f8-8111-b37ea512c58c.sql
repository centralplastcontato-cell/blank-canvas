
-- Add pinned_message_id to conversations
ALTER TABLE public.wapi_conversations 
ADD COLUMN IF NOT EXISTS pinned_message_id uuid REFERENCES public.wapi_messages(id) ON DELETE SET NULL;

-- Allow users with company access to update pinned_message_id
-- (RLS policies already exist on wapi_conversations)
