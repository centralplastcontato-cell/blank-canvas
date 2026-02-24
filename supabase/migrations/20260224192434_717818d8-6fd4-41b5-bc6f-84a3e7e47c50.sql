
ALTER TABLE public.wapi_bot_settings
  ADD COLUMN follow_up_3_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN follow_up_3_delay_hours integer NOT NULL DEFAULT 72,
  ADD COLUMN follow_up_3_message text,
  ADD COLUMN follow_up_4_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN follow_up_4_delay_hours integer NOT NULL DEFAULT 96,
  ADD COLUMN follow_up_4_message text;
