-- Desativar Flow Builder nas duas instâncias para voltar ao bot fixo
UPDATE wapi_bot_settings
SET use_flow_builder = false
WHERE instance_id IN (
  '9b846163-9580-436b-a33e-1e0eca106514',
  '3f39419e-e7f5-4c3b-8ebd-1703e6c7a0c7'
);

-- Limpar estados pendentes do Flow Builder
UPDATE flow_lead_state
SET waiting_for_reply = false
WHERE flow_id = 'f0f00000-0000-0000-0000-000000000001'
AND waiting_for_reply = true;