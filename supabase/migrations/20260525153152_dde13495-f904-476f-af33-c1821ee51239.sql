CREATE TABLE IF NOT EXISTS public.message_trace_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tracking_id TEXT,
  provider TEXT,
  instance_id TEXT,
  company_id UUID,
  conversation_id UUID,
  message_id TEXT,
  phone TEXT,
  direction TEXT,
  stage TEXT NOT NULL,
  status TEXT NOT NULL,
  payload_summary JSONB,
  error_message TEXT,
  latency_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mtl_tracking_id ON public.message_trace_logs(tracking_id) WHERE tracking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mtl_message_id ON public.message_trace_logs(message_id) WHERE message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mtl_phone ON public.message_trace_logs(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mtl_conversation_id ON public.message_trace_logs(conversation_id) WHERE conversation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mtl_company_created ON public.message_trace_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mtl_created_at ON public.message_trace_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mtl_stage_status ON public.message_trace_logs(stage, status);

ALTER TABLE public.message_trace_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read message traces"
ON public.message_trace_logs
FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR (
    company_id IS NOT NULL
    AND company_id = ANY (public.get_user_company_ids(auth.uid()))
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text IN ('admin', 'gestor')
    )
  )
);

CREATE POLICY "Authenticated insert traces"
ON public.message_trace_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.log_message_trace(
  _tracking_id TEXT,
  _provider TEXT,
  _instance_id TEXT,
  _company_id UUID,
  _conversation_id UUID,
  _message_id TEXT,
  _phone TEXT,
  _direction TEXT,
  _stage TEXT,
  _status TEXT,
  _payload_summary JSONB DEFAULT NULL,
  _error_message TEXT DEFAULT NULL,
  _latency_ms INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.message_trace_logs(
      tracking_id, provider, instance_id, company_id, conversation_id,
      message_id, phone, direction, stage, status,
      payload_summary, error_message, latency_ms
    ) VALUES (
      _tracking_id, _provider, _instance_id, _company_id, _conversation_id,
      _message_id, _phone, _direction, _stage, _status,
      _payload_summary, _error_message, _latency_ms
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_message_trace(
  TEXT, TEXT, TEXT, UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, INTEGER
) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.cleanup_message_trace_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted INTEGER;
BEGIN
  DELETE FROM public.message_trace_logs
  WHERE created_at < now() - INTERVAL '14 days';
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;