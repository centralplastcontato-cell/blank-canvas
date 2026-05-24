-- ============================================
-- Etapa 1: Fila de envio pós-reconexão WhatsApp
-- ============================================

-- Tabela da fila
CREATE TABLE IF NOT EXISTS public.whatsapp_outbound_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  instance_id uuid NOT NULL,
  to_phone text NOT NULL,
  payload jsonb NOT NULL,
  source text NOT NULL DEFAULT 'bot',
  status text NOT NULL DEFAULT 'pending',
  scheduled_for timestamptz,
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  approved_at timestamptz,
  approved_by uuid,
  sent_at timestamptz,
  rejected_at timestamptz,
  rejected_by uuid,
  contact_name text,
  preview text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices para o processador
CREATE INDEX IF NOT EXISTS idx_wa_queue_company_status ON public.whatsapp_outbound_queue (company_id, status);
CREATE INDEX IF NOT EXISTS idx_wa_queue_instance_status_sched ON public.whatsapp_outbound_queue (instance_id, status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_wa_queue_status_created ON public.whatsapp_outbound_queue (status, created_at);

-- Trigger updated_at
CREATE TRIGGER tg_wa_queue_updated_at
  BEFORE UPDATE ON public.whatsapp_outbound_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.whatsapp_outbound_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view queue from their companies"
  ON public.whatsapp_outbound_queue FOR SELECT
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())) OR public.is_admin(auth.uid()));

CREATE POLICY "Users can update queue from their companies"
  ON public.whatsapp_outbound_queue FOR UPDATE
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())) OR public.is_admin(auth.uid()));

CREATE POLICY "Users can delete queue from their companies"
  ON public.whatsapp_outbound_queue FOR DELETE
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())) OR public.is_admin(auth.uid()));

-- INSERT só via service role (edge functions). Não criamos política de INSERT para authenticated.

-- Configuração na instância
ALTER TABLE public.wapi_instances
  ADD COLUMN IF NOT EXISTS queue_auto_approve_minutes int NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS queue_drip_seconds_min int NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS queue_drip_seconds_max int NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS queue_max_per_hour int NOT NULL DEFAULT 10;