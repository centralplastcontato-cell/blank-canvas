-- Fix Aventura Kids bot settings with null company_id
UPDATE wapi_bot_settings 
SET company_id = (SELECT company_id FROM wapi_instances WHERE id = wapi_bot_settings.instance_id)
WHERE company_id IS NULL AND id = 'c931b42a-f5d1-4a11-bb74-4b3e60d20a7e';