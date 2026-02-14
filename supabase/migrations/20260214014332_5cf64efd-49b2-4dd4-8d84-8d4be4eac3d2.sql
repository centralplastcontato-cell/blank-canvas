-- One-time data fix: set correct delay for LITE-MY22EC instance
-- Using DO block to perform update
DO $$
BEGIN
  UPDATE public.wapi_bot_settings 
  SET bot_inactive_followup_delay_minutes = 6
  WHERE instance_id = '3f39419e-e7f5-4c3b-8ebd-1703e6c7a0c7';
END $$;
