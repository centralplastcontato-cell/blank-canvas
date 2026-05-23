-- Etapa 1: Caixa-preta dos webhooks WhatsApp
-- Armazena TODO evento bruto recebido, antes de qualquer filtro/processamento.
-- Garante rastreabilidade total: nenhuma mensagem se perde sem deixar rastro.

CREATE TABLE IF NOT EXISTS public.wapi_webhook_raw_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at timestamptz NOT NULL DEFAULT now(),
  provider text,
  instance_id text,
  event_type text,
  remote_jid text,
  from_me boolean,
  message_id text,
  is_group boolean,
  is_status_broadcast boolean,
  has_content boolean,
  processing_status text NOT NULL DEFAULT 'received',
  processing_note text,
  conversation_id uuid,
  message_db_id uuid,
  payload jsonb NOT NULL,
  headers jsonb,
  ip text,
  error text
);

CREATE INDEX IF NOT EXISTS idx_wapi_raw_received_at ON public.wapi_webhook_raw_events (received_at DESC);
CREATE INDEX IF NOT EXISTS idx_wapi_raw_instance ON public.wapi_webhook_raw_events (instance_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_wapi_raw_remote_jid ON public.wapi_webhook_raw_events (remote_jid, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_wapi_raw_status ON public.wapi_webhook_raw_events (processing_status, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_wapi_raw_message_id ON public.wapi_webhook_raw_events (message_id);

ALTER TABLE public.wapi_webhook_raw_events ENABLE ROW LEVEL SECURITY;

-- Apenas admin global pode ler (diagnóstico). Edge function usa service_role e ignora RLS.
CREATE POLICY "Admins can view raw webhook events"
ON public.wapi_webhook_raw_events
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Retenção: 14 dias é suficiente para auditoria; evita inchar a base.
COMMENT ON TABLE public.wapi_webhook_raw_events IS 'Caixa-preta: todo webhook recebido é salvo aqui antes de qualquer filtro. Retenção sugerida: 14 dias.';