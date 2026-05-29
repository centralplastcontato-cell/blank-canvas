ALTER TABLE public.wapi_bot_settings
  ADD COLUMN IF NOT EXISTS follow_up_image_url TEXT,
  ADD COLUMN IF NOT EXISTS follow_up_2_image_url TEXT,
  ADD COLUMN IF NOT EXISTS follow_up_3_image_url TEXT,
  ADD COLUMN IF NOT EXISTS follow_up_4_image_url TEXT;