UPDATE wapi_bot_settings
SET 
  follow_up_enabled = false,
  follow_up_2_enabled = false,
  follow_up_3_enabled = false,
  follow_up_4_enabled = false
WHERE instance_id IN (
  SELECT id FROM wapi_instances WHERE company_id = '6bc204ae-1311-4c67-bb6b-9ab55dae9d11'
);