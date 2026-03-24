CREATE TABLE public.company_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL DEFAULT 'outros',
  unit text,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.company_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage expenses of their companies"
ON public.company_expenses FOR ALL TO authenticated
USING (company_id IN (SELECT unnest(public.get_user_company_ids(auth.uid()))))
WITH CHECK (company_id IN (SELECT unnest(public.get_user_company_ids(auth.uid()))));