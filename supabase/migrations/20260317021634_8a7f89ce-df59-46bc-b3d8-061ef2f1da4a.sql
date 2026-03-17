
-- Table to store monthly reviews per company
CREATE TABLE public.monthly_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  review_month DATE NOT NULL, -- First day of the reviewed month (e.g., 2026-02-01)
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  previous_metrics JSONB DEFAULT NULL,
  ai_summary TEXT,
  ai_context_generated TEXT,
  dismissed_by UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, review_month)
);

-- RLS
ALTER TABLE public.monthly_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company reviews"
  ON public.monthly_reviews FOR SELECT TO authenticated
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Admin can manage reviews"
  ON public.monthly_reviews FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

-- Allow users to update dismissed_by for their company reviews
CREATE POLICY "Users can dismiss reviews"
  ON public.monthly_reviews FOR UPDATE TO authenticated
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())))
  WITH CHECK (company_id = ANY(public.get_user_company_ids(auth.uid())));

-- Index for quick lookups
CREATE INDEX idx_monthly_reviews_company_month ON public.monthly_reviews(company_id, review_month DESC);
