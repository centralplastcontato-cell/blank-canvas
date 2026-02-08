-- Add media_direct_path column to store the directPath required by W-API download
ALTER TABLE public.wapi_messages 
ADD COLUMN IF NOT EXISTS media_direct_path TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN public.wapi_messages.media_direct_path IS 'Direct path for W-API media download - required along with mediaKey';