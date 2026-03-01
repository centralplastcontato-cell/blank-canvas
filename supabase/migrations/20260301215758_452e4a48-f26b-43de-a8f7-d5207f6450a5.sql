
-- Create base_leads table for manual contact lists used in campaigns
CREATE TABLE public.base_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  is_former_client BOOLEAN NOT NULL DEFAULT false,
  former_party_info TEXT,
  month_interest TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.base_leads ENABLE ROW LEVEL SECURITY;

-- Users can view base_leads for their companies
CREATE POLICY "Users can view base_leads of their companies"
ON public.base_leads FOR SELECT TO authenticated
USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

-- Users can insert base_leads for their companies
CREATE POLICY "Users can insert base_leads for their companies"
ON public.base_leads FOR INSERT TO authenticated
WITH CHECK (company_id = ANY(public.get_user_company_ids(auth.uid())));

-- Users can update base_leads of their companies
CREATE POLICY "Users can update base_leads of their companies"
ON public.base_leads FOR UPDATE TO authenticated
USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

-- Users can delete base_leads of their companies
CREATE POLICY "Users can delete base_leads of their companies"
ON public.base_leads FOR DELETE TO authenticated
USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

-- Index for faster company queries
CREATE INDEX idx_base_leads_company_id ON public.base_leads(company_id);
