-- Add is_closed column to wapi_conversations for closed/finished conversations
ALTER TABLE public.wapi_conversations 
ADD COLUMN is_closed boolean DEFAULT false;