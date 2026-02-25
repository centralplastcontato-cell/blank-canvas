
-- Re-enable bot for Planeta Divertido instance
UPDATE wapi_bot_settings 
SET bot_enabled = true, company_id = '6bc204ae-1311-4c67-bb6b-9ab55dae9d11' 
WHERE instance_id = 'ac422826-d1a9-40a6-8ce2-acc5a0c1cb64';

-- Reset test conversation to welcome step
UPDATE wapi_conversations 
SET bot_step = 'welcome', bot_data = '{}', bot_enabled = true 
WHERE id = '9e13379a-34eb-4cdd-859b-b36576e2afd2';
