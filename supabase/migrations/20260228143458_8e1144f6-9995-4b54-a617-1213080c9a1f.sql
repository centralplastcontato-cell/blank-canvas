
-- Passo 1: Limpar estados de fluxo do bot vinculados a conversas @lid
DELETE FROM flow_lead_state 
WHERE conversation_id IN (
  SELECT id FROM wapi_conversations WHERE remote_jid LIKE '%@lid'
);

-- Passo 2: Limpar mensagens vinculadas a conversas @lid
DELETE FROM wapi_messages 
WHERE conversation_id IN (
  SELECT id FROM wapi_conversations WHERE remote_jid LIKE '%@lid'
);

-- Passo 3: Limpar as conversas fantasma @lid
DELETE FROM wapi_conversations 
WHERE remote_jid LIKE '%@lid';
