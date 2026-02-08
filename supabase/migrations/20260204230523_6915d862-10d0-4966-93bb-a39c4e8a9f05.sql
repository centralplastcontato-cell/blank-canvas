-- Add is_equipe column to wapi_conversations
ALTER TABLE public.wapi_conversations
ADD COLUMN is_equipe boolean NOT NULL DEFAULT false;