
-- Fix the two stuck conversations that responded "3" but bot didn't process
UPDATE wapi_conversations 
SET bot_step = 'complete_final', 
    bot_enabled = false,
    bot_data = jsonb_set(COALESCE(bot_data::jsonb, '{}'::jsonb), '{proximo_passo}', '"Analisar com calma"')
WHERE id IN ('770aba92-feda-4f05-affb-19fb28957cc1', '70100ac7-3995-4a25-b94a-4e5ac6cc44d6');

-- Update lead status to aguardando_resposta
UPDATE campaign_leads 
SET status = 'aguardando_resposta'
WHERE id IN ('0cec50f1-3553-4529-84f5-be4d7ae12356', '4189343f-8c26-46c5-b797-b32c5d917db1')
AND status != 'aguardando_resposta';

-- Record in history
INSERT INTO lead_history (lead_id, action, new_value) VALUES 
('0cec50f1-3553-4529-84f5-be4d7ae12356', 'Próximo passo escolhido', 'Analisar com calma'),
('4189343f-8c26-46c5-b797-b32c5d917db1', 'Próximo passo escolhido', 'Analisar com calma');
