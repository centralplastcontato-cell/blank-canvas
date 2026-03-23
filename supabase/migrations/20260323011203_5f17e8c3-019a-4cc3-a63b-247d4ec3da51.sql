-- 1. Execution log table for audit
CREATE TABLE public.reactivation_execution_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  executed_at timestamptz DEFAULT now(),
  total_sent integer DEFAULT 0,
  total_skipped integer DEFAULT 0,
  total_errors integer DEFAULT 0,
  details jsonb DEFAULT '{}'
);

ALTER TABLE public.reactivation_execution_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view reactivation logs"
  ON public.reactivation_execution_log FOR SELECT
  TO authenticated
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

-- 2. Add anti-burst config columns to reactivation settings
ALTER TABLE public.automation_reactivation_settings
  ADD COLUMN IF NOT EXISTS max_daily_sends integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS max_per_execution integer NOT NULL DEFAULT 50;