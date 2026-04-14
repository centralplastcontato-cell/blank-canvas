
-- Tabela de log de atividades / auditoria
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  entity_name TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para consultas frequentes
CREATE INDEX idx_activity_logs_company_id ON public.activity_logs(company_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_module ON public.activity_logs(module);
CREATE INDEX idx_activity_logs_action ON public.activity_logs(action);
CREATE INDEX idx_activity_logs_company_created ON public.activity_logs(company_id, created_at DESC);

-- Habilitar RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Política: usuários autenticados podem inserir logs da própria empresa
CREATE POLICY "Users can insert activity logs for their company"
ON public.activity_logs
FOR INSERT
TO authenticated
WITH CHECK (
  company_id = ANY(get_user_company_ids(auth.uid()))
);

-- Política: apenas usuários da empresa podem visualizar logs
CREATE POLICY "Users can view activity logs of their company"
ON public.activity_logs
FOR SELECT
TO authenticated
USING (
  company_id = ANY(get_user_company_ids(auth.uid()))
);
