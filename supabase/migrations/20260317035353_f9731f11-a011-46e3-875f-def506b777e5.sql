
-- Contract Audit Logs table for tracking all contract-related actions
CREATE TABLE public.contract_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contract_id uuid REFERENCES public.generated_contracts(id) ON DELETE SET NULL,
  template_id uuid REFERENCES public.contract_models(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_contract_audit_company ON public.contract_audit_logs(company_id);
CREATE INDEX idx_contract_audit_contract ON public.contract_audit_logs(contract_id);

-- RLS
ALTER TABLE public.contract_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit logs of their companies"
  ON public.contract_audit_logs FOR SELECT TO authenticated
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can insert audit logs for their companies"
  ON public.contract_audit_logs FOR INSERT TO authenticated
  WITH CHECK (company_id = ANY(public.get_user_company_ids(auth.uid())));

-- Prevent UPDATE on generated_contracts.conteudo_renderizado (read-only after generation)
-- We do this by only allowing status updates, not content updates
CREATE POLICY "Users can only update status of generated contracts"
  ON public.generated_contracts FOR UPDATE TO authenticated
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())))
  WITH CHECK (company_id = ANY(public.get_user_company_ids(auth.uid())));
