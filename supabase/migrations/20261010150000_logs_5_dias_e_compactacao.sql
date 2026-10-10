-- Registros técnicos: de 14 para 5 dias, e compactação uma vez de madrugada.
--   - wapi_webhook_raw_events: cópia bruta de cada aviso do WhatsApp
--   - message_trace_logs: rastreio de cada envio (tela "Diagnóstico Msg")
-- Conversas, mensagens, leads e festas NÃO são tocados.

-- Parte 1) A limpeza que já roda a cada 10 min passa a manter só 5 dias
CREATE OR REPLACE FUNCTION public.cleanup_technical_logs(_batch integer DEFAULT 20000)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  raw_deleted integer;
  trace_deleted integer;
BEGIN
  DELETE FROM public.wapi_webhook_raw_events
  WHERE id IN (
    SELECT id FROM public.wapi_webhook_raw_events
    WHERE received_at < now() - interval '5 days'
    ORDER BY received_at
    LIMIT _batch
  );
  GET DIAGNOSTICS raw_deleted = ROW_COUNT;

  DELETE FROM public.message_trace_logs
  WHERE id IN (
    SELECT id FROM public.message_trace_logs
    WHERE created_at < now() - interval '5 days'
    ORDER BY created_at
    LIMIT _batch
  );
  GET DIAGNOSTICS trace_deleted = ROW_COUNT;

  RETURN jsonb_build_object('raw_events', raw_deleted, 'trace_logs', trace_deleted);
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_technical_logs(integer) FROM PUBLIC, anon, authenticated;

-- Parte 2) Compactação UMA vez, domingo 11/10 às 4h (Brasília = 07h UTC),
-- quando quase não chega mensagem. Devolve o espaço que sobrou das linhas
-- apagadas. Às 4h30 os dois agendamentos se apagam sozinhos.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'compactar-raw-events') THEN PERFORM cron.unschedule('compactar-raw-events'); END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'compactar-trace-logs') THEN PERFORM cron.unschedule('compactar-trace-logs'); END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'compactar-fim') THEN PERFORM cron.unschedule('compactar-fim'); END IF;
END;
$$;
SELECT cron.schedule('compactar-raw-events', '0 7 11 10 *', $$ VACUUM (FULL, ANALYZE) public.wapi_webhook_raw_events $$);
SELECT cron.schedule('compactar-trace-logs', '10 7 11 10 *', $$ VACUUM (FULL, ANALYZE) public.message_trace_logs $$);
SELECT cron.schedule('compactar-fim', '30 7 11 10 *', $$ SELECT cron.unschedule(jobname) FROM cron.job WHERE jobname IN ('compactar-raw-events', 'compactar-trace-logs', 'compactar-fim') $$);
