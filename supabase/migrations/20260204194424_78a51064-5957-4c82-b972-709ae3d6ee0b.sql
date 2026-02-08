-- Add field to track scheduled visits on conversations
ALTER TABLE public.wapi_conversations 
ADD COLUMN has_scheduled_visit boolean NOT NULL DEFAULT false;