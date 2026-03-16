
CREATE TABLE public.alerts_system (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  alert_message text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  related_filter jsonb,
  alert_hash text NOT NULL,
  UNIQUE (company_id, alert_hash, resolved)
);

ALTER TABLE public.alerts_system ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read alerts for their companies"
  ON public.alerts_system FOR SELECT TO authenticated
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Service role can manage alerts"
  ON public.alerts_system FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX idx_alerts_system_company_active ON public.alerts_system (company_id, resolved, created_at DESC);
