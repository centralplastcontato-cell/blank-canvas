-- Apaga mensagens das conversas-fantasma (status@ e @lid órfãs)
DELETE FROM public.wapi_messages
WHERE conversation_id IN (
  SELECT id FROM public.wapi_conversations
  WHERE remote_jid ILIKE 'status@%'
     OR remote_jid ILIKE '%@broadcast%'
     OR remote_jid ILIKE '%@lid'
);

-- Apaga flow_lead_state vinculado
DELETE FROM public.flow_lead_state
WHERE conversation_id IN (
  SELECT id FROM public.wapi_conversations
  WHERE remote_jid ILIKE 'status@%'
     OR remote_jid ILIKE '%@broadcast%'
     OR remote_jid ILIKE '%@lid'
);

-- Apaga as conversas-fantasma
DELETE FROM public.wapi_conversations
WHERE remote_jid ILIKE 'status@%'
   OR remote_jid ILIKE '%@broadcast%'
   OR remote_jid ILIKE '%@lid';