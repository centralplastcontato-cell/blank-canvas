UPDATE wapi_bot_settings 
SET bot_enabled = true, test_mode_enabled = false, updated_at = now()
WHERE instance_id IN ('9b846163-9580-436b-a33e-1e0eca106514', '3f39419e-e7f5-4c3b-8ebd-1703e6c7a0c7');