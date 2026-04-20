
CREATE TABLE public.financial_consents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  entity_table TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  amount NUMERIC,
  requested_by UUID,
  requested_by_name TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_by_name TEXT,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT
);

CREATE INDEX idx_financial_consents_company_status ON public.financial_consents(company_id, status);
CREATE INDEX idx_financial_consents_entity ON public.financial_consents(entity_table, entity_id);

ALTER TABLE public.financial_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view consents"
ON public.financial_consents FOR SELECT
TO authenticated
USING (company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Company members can create consents"
ON public.financial_consents FOR INSERT
TO authenticated
WITH CHECK (company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Company members can update consents"
ON public.financial_consents FOR UPDATE
TO authenticated
USING (company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()));

CREATE POLICY "Company members can delete consents"
ON public.financial_consents FOR DELETE
TO authenticated
USING (company_id IN (SELECT company_id FROM public.user_companies WHERE user_id = auth.uid()));
