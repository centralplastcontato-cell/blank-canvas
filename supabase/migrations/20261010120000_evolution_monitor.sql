-- Monitor dos números da Evolution Go: estado de cada número (e do servidor),
-- tentativas de reconexão e o último alerta enviado (para não repetir).
-- Só as funções do servidor (service role) leem e gravam.
CREATE TABLE IF NOT EXISTS public.provider_health (
  key text PRIMARY KEY,                 -- 'evolution:server' | 'instance:<wapi_instances.id>'
  instance_id uuid REFERENCES public.wapi_instances(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'unknown', -- online | reconnecting | needs_qr | unreachable | down
  state_since timestamptz NOT NULL DEFAULT now(),
  bad_checks integer NOT NULL DEFAULT 0,
  reconnect_attempts integer NOT NULL DEFAULT 0,
  alerted_state text,
  alerted_at timestamptz,
  last_check_at timestamptz,
  detail jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.provider_health ENABLE ROW LEVEL SECURITY;

-- A cada 5 minutos (chave pública anon, como o cron do follow-up-check)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'evolution-monitor-5min') THEN
    PERFORM cron.unschedule('evolution-monitor-5min');
  END IF;
END;
$$;

SELECT cron.schedule(
  'evolution-monitor-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://rsezgnkfhodltrsewlhz.supabase.co/functions/v1/evolution-monitor',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzZXpnbmtmaG9kbHRyc2V3bGh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1Nzc2NjcsImV4cCI6MjA4NjE1MzY2N30.FIgluyyGXUIbwfYMxUeyQHHnH-_EgmqpVGXZByjVkMw"}'::jsonb,
    body    := '{"reason":"cron"}'::jsonb
  ) AS request_id;
  $$
);
