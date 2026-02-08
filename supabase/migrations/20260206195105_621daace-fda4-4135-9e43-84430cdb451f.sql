-- Add configurable delay between messages for the WhatsApp bot
ALTER TABLE public.wapi_bot_settings 
ADD COLUMN IF NOT EXISTS message_delay_seconds integer DEFAULT 5;

-- Add comment for documentation
COMMENT ON COLUMN public.wapi_bot_settings.message_delay_seconds IS 'Delay in seconds between bot messages (5, 10, or 15 seconds)';