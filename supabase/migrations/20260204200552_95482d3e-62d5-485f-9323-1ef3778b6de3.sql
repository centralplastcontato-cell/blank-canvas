-- Add field to track freelancer contacts on conversations
ALTER TABLE public.wapi_conversations 
ADD COLUMN is_freelancer boolean NOT NULL DEFAULT false;