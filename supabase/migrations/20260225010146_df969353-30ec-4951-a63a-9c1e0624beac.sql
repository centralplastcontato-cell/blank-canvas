ALTER TABLE public.wapi_bot_settings
ADD COLUMN IF NOT EXISTS auto_lost_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS auto_lost_delay_hours integer NOT NULL DEFAULT 48;