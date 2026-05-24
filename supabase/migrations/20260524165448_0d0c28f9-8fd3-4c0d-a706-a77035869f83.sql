-- Etapa 5: Modo aquecimento pós-bloqueio
-- Quando uma instância foi bloqueada/banida pelo WhatsApp ou ficou muito tempo offline,
-- o gestor pode ativar o "modo aquecimento": limites de envio progressivos por N dias
-- até voltar ao volume normal. O wapi-queue-processor lê esse estado e aplica o cap
-- daquele dia em vez do queue_max_per_hour padrão.

ALTER TABLE public.wapi_instances
  ADD COLUMN IF NOT EXISTS warmup_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS warmup_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS warmup_days_total integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS warmup_reason text;

-- Curva padrão de mensagens/hora por dia de aquecimento (1..N).
-- Armazenada como array para permitir customização futura por instância.
ALTER TABLE public.wapi_instances
  ADD COLUMN IF NOT EXISTS warmup_curve_per_hour integer[]
    NOT NULL DEFAULT ARRAY[2, 4, 6, 10, 15, 20, 30]::integer[];

COMMENT ON COLUMN public.wapi_instances.warmup_enabled IS 'Quando true, o processador de fila aplica o cap da curva de aquecimento em vez de queue_max_per_hour.';
COMMENT ON COLUMN public.wapi_instances.warmup_started_at IS 'Início do aquecimento. Day = floor((now - started_at)/24h) + 1.';
COMMENT ON COLUMN public.wapi_instances.warmup_curve_per_hour IS 'Caps por hora para cada dia do aquecimento. Após warmup_days_total, volta ao queue_max_per_hour.';