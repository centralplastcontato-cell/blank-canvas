
-- 1. Criar lead para Jessica Yolanda
INSERT INTO campaign_leads (name, whatsapp, unit, campaign_id, campaign_name, status, company_id)
VALUES ('Jessica Yolanda', '5515996382612', 'Trabalhe Conosco', 'whatsapp-bot-rh', 'WhatsApp (Bot) - RH', 'novo', 'a0000000-0000-0000-0000-000000000001');

-- 2. Vincular o lead à conversa
UPDATE wapi_conversations
SET lead_id = (
  SELECT id FROM campaign_leads 
  WHERE whatsapp = '5515996382612' 
  AND company_id = 'a0000000-0000-0000-0000-000000000001'
  LIMIT 1
),
bot_step = 'work_interest'
WHERE id = '6bb469cb-8e74-4599-bdda-37ffa892e246';
