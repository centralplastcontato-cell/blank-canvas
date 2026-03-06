ALTER TABLE public.wapi_bot_settings
  ADD COLUMN IF NOT EXISTS follow_up_min_hour integer NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS follow_up_max_hour integer NOT NULL DEFAULT 22;