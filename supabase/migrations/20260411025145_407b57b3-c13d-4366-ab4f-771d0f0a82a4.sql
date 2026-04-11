-- Point bot settings to the new active Z-API instance
UPDATE wapi_bot_settings 
SET instance_id = 'fff981eb-ebdd-49b6-9643-0251e252b586',
    updated_at = now()
WHERE id = '2d187201-129f-45e6-a145-b3e4a22ea26f'
  AND instance_id = '76060753-8eb9-4324-87e5-72425ca47633';

-- Also update bot_questions if any exist
UPDATE wapi_bot_questions
SET instance_id = 'fff981eb-ebdd-49b6-9643-0251e252b586'
WHERE instance_id = '76060753-8eb9-4324-87e5-72425ca47633';