-- Limpeza da plataforma (out/2026) — rodar UMA vez no SQL Editor do Supabase.
--
-- 1) Registros técnicos guardam só os últimos 14 dias (eram para isso desde
--    o início, mas nunca ganharam a rotina de limpeza e já somam ~3,7 GB):
--    - wapi_webhook_raw_events: cópia bruta de cada aviso do WhatsApp
--    - message_trace_logs: rastreio de cada envio (tela "Diagnóstico Msg")
--    Conversas, mensagens, leads e festas NÃO são tocados.
-- 2) Desliga a rotina da fila de envio, que roda a cada minuto e não faz nada.

-- 1) Limpeza dos registros técnicos, em lotes (não trava o banco)
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
    WHERE received_at < now() - interval '14 days'
    ORDER BY received_at
    LIMIT _batch
  );
  GET DIAGNOSTICS raw_deleted = ROW_COUNT;

  DELETE FROM public.message_trace_logs
  WHERE id IN (
    SELECT id FROM public.message_trace_logs
    WHERE created_at < now() - interval '14 days'
    ORDER BY created_at
    LIMIT _batch
  );
  GET DIAGNOSTICS trace_deleted = ROW_COUNT;

  RETURN jsonb_build_object('raw_events', raw_deleted, 'trace_logs', trace_deleted);
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_technical_logs(integer) FROM PUBLIC, anon, authenticated;

-- A cada 10 min apaga até 20 mil linhas de cada tabela: o acumulado antigo
-- sai em cerca de um dia; depois disso cada rodada apaga só o que venceu.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-technical-logs') THEN
    PERFORM cron.unschedule('cleanup-technical-logs');
  END IF;
END;
$$;
SELECT cron.schedule('cleanup-technical-logs', '*/10 * * * *', $$ SELECT public.cleanup_technical_logs(20000) $$);

-- 2) Fila de envio desativada (a função só responde "desativado")
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'wapi-queue-processor-every-minute') THEN
    PERFORM cron.unschedule('wapi-queue-processor-every-minute');
  END IF;
END;
$$;

-- Conferência: deve mostrar cleanup-technical-logs e não mostrar mais a fila
SELECT jobname, schedule, active FROM cron.job ORDER BY jobname;
