-- Histórico de quedas da Evolution Go (um registro por queda avisada):
-- de um número ou do servidor (fora do ar / provável travamento).
-- Só as funções do servidor (service role) leem e gravam.
CREATE TABLE IF NOT EXISTS public.provider_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,                       -- 'evolution:server' | 'instance:<wapi_instances.id>'
  instance_id uuid REFERENCES public.wapi_instances(id) ON DELETE SET NULL,
  unit text,                               -- número(s) afetado(s)
  cause text,                              -- needs_qr | reconnecting | unreachable | travamento | servidor_fora
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  reminders integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_provider_incidents_open ON public.provider_incidents (key) WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_provider_incidents_started ON public.provider_incidents (started_at DESC);
ALTER TABLE public.provider_incidents ENABLE ROW LEVEL SECURITY;
