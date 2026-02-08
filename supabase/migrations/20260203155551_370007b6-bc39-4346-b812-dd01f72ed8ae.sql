-- Add contact_picture column to store profile picture URL
ALTER TABLE public.wapi_conversations 
ADD COLUMN contact_picture text NULL;