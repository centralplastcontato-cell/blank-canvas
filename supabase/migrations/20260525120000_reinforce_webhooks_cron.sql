-- Migration: cron wapi-reinforce-webhooks (a cada 30 minutos)
--
-- PRÉ-REQUISITO: antes de aplicar esta migration, insira a service_role key
-- no Supabase Vault via SQL Editor (uma vez, nunca commitado):
--
--   SELECT vault.create_secret(
--     'reinforce_webhooks_service_key',
--     '<sua_service_role_key>',
--     'Service key para cron wapi-reinforce-webhooks'
--   );
--
-- A chave é lida do Vault em cada execução do cron — nunca fica neste arquivo.

-- Garante extensões necessárias (já devem estar ativas no projeto)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Remove job anterior se existir (torna a migration idempotente)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reinforce-webhooks-30min') THEN
    PERFORM cron.unschedule('reinforce-webhooks-30min');
  END IF;
END;
$$;

-- Cria o cron job: dispara a cada 30 minutos e lê a chave do Vault em cada execução.
-- O Vault descriptografa o segredo em runtime — a chave nunca fica em texto claro aqui.
SELECT cron.schedule(
  'reinforce-webhooks-30min',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://rsezgnkfhodltrsewlhz.supabase.co/functions/v1/wapi-reinforce-webhooks',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret
        FROM   vault.decrypted_secrets
        WHERE  name = 'reinforce_webhooks_service_key'
        LIMIT  1
      )
    ),
    body    := '{"source":"cron"}'::jsonb
  ) AS request_id;
  $$
);
