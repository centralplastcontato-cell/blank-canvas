-- Habilitar o bot para Planeta Divertido
UPDATE wapi_bot_settings 
SET bot_enabled = true 
WHERE instance_id = 'ac422826-d1a9-40a6-8ce2-acc5a0c1cb64';

-- Resetar conversa de teste para reiniciar o bot
UPDATE wapi_conversations 
SET bot_step = NULL, bot_data = '{}', bot_enabled = true 
WHERE id = '9e13379a-34eb-4cdd-859b-b36576e2afd2';