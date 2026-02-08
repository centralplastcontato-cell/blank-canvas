-- Add media_key column to store the encryption key for media downloads
-- This is required by W-API to download media after the initial webhook
ALTER TABLE public.wapi_messages 
ADD COLUMN IF NOT EXISTS media_key TEXT;