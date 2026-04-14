
CREATE TABLE public.expense_subcategories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (company_id, category, name)
);

ALTER TABLE public.expense_subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company subcategories"
ON public.expense_subcategories FOR SELECT TO authenticated
USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can create subcategories for their company"
ON public.expense_subcategories FOR INSERT TO authenticated
WITH CHECK (company_id = ANY(public.get_user_company_ids(auth.uid())));

-- Add subcategory column to company_expenses
ALTER TABLE public.company_expenses ADD COLUMN subcategory TEXT;
