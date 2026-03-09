ALTER TABLE public.wapi_bot_settings
  ADD COLUMN IF NOT EXISTS follow_up_send_min_delay integer NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS follow_up_send_max_delay integer NOT NULL DEFAULT 15;