ALTER TABLE public.wapi_conversations
  ADD COLUMN IF NOT EXISTS bot_paused_until timestamp with time zone,
  ADD COLUMN IF NOT EXISTS bot_paused_reason text,
  ADD COLUMN IF NOT EXISTS bot_paused_at timestamp with time zone;

CREATE INDEX IF NOT EXISTS idx_wapi_conversations_bot_paused_until
  ON public.wapi_conversations (bot_paused_until)
  WHERE bot_paused_until IS NOT NULL;