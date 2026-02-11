-- Ativar bot_inactive_followup para todas as instâncias existentes
UPDATE wapi_bot_settings 
SET bot_inactive_followup_enabled = true, 
    bot_inactive_followup_delay_minutes = COALESCE(NULLIF(bot_inactive_followup_delay_minutes, 0), 10)
WHERE bot_inactive_followup_enabled = false OR bot_inactive_followup_enabled IS NULL;

-- Alterar o default da coluna para que novas instâncias já venham com o bot_inactive_followup ativado
ALTER TABLE wapi_bot_settings 
ALTER COLUMN bot_inactive_followup_enabled SET DEFAULT true;

ALTER TABLE wapi_bot_settings 
ALTER COLUMN bot_inactive_followup_delay_minutes SET DEFAULT 10;