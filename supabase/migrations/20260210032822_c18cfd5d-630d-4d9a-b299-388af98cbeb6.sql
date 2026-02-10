-- Fix null company_id on Trujillo bot_settings
UPDATE wapi_bot_settings 
SET company_id = 'a0000000-0000-0000-0000-000000000001' 
WHERE id = 'd01db8ca-6cca-4d53-b8eb-766317bf1143' 
  AND company_id IS NULL;