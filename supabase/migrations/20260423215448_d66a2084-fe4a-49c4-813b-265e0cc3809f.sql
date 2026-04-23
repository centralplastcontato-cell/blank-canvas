ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS pause_bot_on_reply boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_reply_message text;