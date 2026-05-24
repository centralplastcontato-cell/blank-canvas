-- Corrigir mensagens manuais Z-API da Marina Martins que foram associadas
-- à conversa do próprio buffet por causa de payload fromMe com @lid.
WITH target AS (
  SELECT '530a2d5d-3643-444c-9ac3-974dc0de236d'::uuid AS marina_conversation_id,
         '9881e748-8312-459a-9ce7-55efe6f08813'::uuid AS wrong_conversation_id
), moved AS (
  UPDATE public.wapi_messages m
  SET conversation_id = target.marina_conversation_id,
      company_id = '6bc204ae-1311-4c67-bb6b-9ab55dae9d11'::uuid,
      metadata = coalesce(m.metadata, '{}'::jsonb) || jsonb_build_object(
        'corrected_from_conversation_id', target.wrong_conversation_id,
        'correction_reason', 'zapi_fromme_lid_contact_name_resolution',
        'corrected_at', now()
      )
  FROM target
  WHERE m.conversation_id = target.wrong_conversation_id
    AND m.message_id IN (
      'A50012EFAACF7105622BB81CA0054131',
      'A5888CA58557DE3B59F9B4BF53FB5EE2',
      'A529B4FC7C6C8159898043C80E4C2104',
      'A56F16B7A3D9A7421C8297F0334B99C9'
    )
  RETURNING m.*
), marina_last AS (
  SELECT m.conversation_id, m.content, m.from_me, m.timestamp
  FROM public.wapi_messages m, target
  WHERE m.conversation_id = target.marina_conversation_id
  ORDER BY m.timestamp DESC, m.created_at DESC
  LIMIT 1
), wrong_last AS (
  SELECT m.conversation_id, m.content, m.from_me, m.timestamp
  FROM public.wapi_messages m, target
  WHERE m.conversation_id = target.wrong_conversation_id
  ORDER BY m.timestamp DESC, m.created_at DESC
  LIMIT 1
), update_marina AS (
  UPDATE public.wapi_conversations c
  SET last_message_at = marina_last.timestamp,
      last_message_content = left(coalesce(marina_last.content, ''), 100),
      last_message_from_me = marina_last.from_me,
      updated_at = now()
  FROM marina_last
  WHERE c.id = marina_last.conversation_id
  RETURNING c.id
)
UPDATE public.wapi_conversations c
SET last_message_at = wrong_last.timestamp,
    last_message_content = left(coalesce(wrong_last.content, ''), 100),
    last_message_from_me = wrong_last.from_me,
    updated_at = now()
FROM wrong_last
WHERE c.id = wrong_last.conversation_id;