-- Create table for standalone revenue entries
CREATE TABLE public.company_revenues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  revenue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  bank_account_id UUID REFERENCES public.company_bank_accounts(id) ON DELETE SET NULL,
  receipt_url TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_revenues ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view revenues of their companies"
ON public.company_revenues FOR SELECT TO authenticated
USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can create revenues for their companies"
ON public.company_revenues FOR INSERT TO authenticated
WITH CHECK (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can update revenues of their companies"
ON public.company_revenues FOR UPDATE TO authenticated
USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can delete revenues of their companies"
ON public.company_revenues FOR DELETE TO authenticated
USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

-- Index for performance
CREATE INDEX idx_company_revenues_company_date ON public.company_revenues(company_id, revenue_date);

-- Trigger for updated_at
CREATE TRIGGER update_company_revenues_updated_at
BEFORE UPDATE ON public.company_revenues
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();