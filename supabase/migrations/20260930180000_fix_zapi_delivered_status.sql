-- 1) Índice para achar a mensagem pelo id do WhatsApp. Cada aviso de tique
--    (entregue/lido) procura a mensagem por message_id; o único índice que tinha
--    esse campo começa por conversation_id e não serve para essa busca.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'wapi_messages'
      AND indexdef ~* '\(message_id\)'
  ) THEN
    CREATE INDEX idx_wapi_messages_message_id ON public.wapi_messages (message_id);
  END IF;
END $$;

-- 2) Z-API: o aviso "RECEIVED" (entregue, dois tiques) não era reconhecido, então
--    toda mensagem entregue e ainda não lida ficava com um tique só. Recupera os
--    últimos 7 dias a partir dos avisos brutos que ficaram guardados.
UPDATE public.wapi_messages m
SET status = 'delivered'
FROM (
  SELECT DISTINCT jsonb_array_elements_text(payload->'ids') AS mid
  FROM public.wapi_webhook_raw_events
  WHERE received_at > now() - interval '7 days'
    AND payload->>'type' = 'MessageStatusCallback'
    AND upper(payload->>'status') = 'RECEIVED'
    AND jsonb_typeof(payload->'ids') = 'array'
) r
WHERE m.message_id = r.mid
  AND m.from_me = true
  AND (m.status IS NULL OR m.status IN ('pending', 'sent', 'error'));

-- 3) Os alertas "Mensagem pode não ter chegado" criados até agora eram um por
--    cliente e, na Z-API, quase todos falsos. Apaga e deixa a nova regra (um
--    alerta por número, só quando o problema é do número) reavaliar as
--    mensagens das últimas horas que continuam sem confirmação.
DELETE FROM public.notifications WHERE type = 'message_stuck';

UPDATE public.wapi_messages
SET stuck_alert_sent_at = NULL
WHERE stuck_alert_sent_at IS NOT NULL
  AND from_me = true
  AND status = 'sent'
  AND timestamp > now() - interval '6 hours';
