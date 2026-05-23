DELETE FROM public.wapi_messages
WHERE conversation_id IN (
  SELECT id FROM public.wapi_conversations
  WHERE remote_jid ILIKE 'status@%'
     OR remote_jid ILIKE '%@broadcast%'
     OR remote_jid ILIKE '%@newsletter%'
     OR contact_phone = 'status'
);

DELETE FROM public.flow_lead_state
WHERE conversation_id IN (
  SELECT id FROM public.wapi_conversations
  WHERE remote_jid ILIKE 'status@%'
     OR remote_jid ILIKE '%@broadcast%'
     OR remote_jid ILIKE '%@newsletter%'
     OR contact_phone = 'status'
);

DELETE FROM public.wapi_conversations
WHERE remote_jid ILIKE 'status@%'
   OR remote_jid ILIKE '%@broadcast%'
   OR remote_jid ILIKE '%@newsletter%'
   OR contact_phone = 'status';