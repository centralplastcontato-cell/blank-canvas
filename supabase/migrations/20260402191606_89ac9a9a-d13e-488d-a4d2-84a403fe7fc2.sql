CREATE TABLE public.company_optionals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  value NUMERIC(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.company_optionals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view optionals of their company"
  ON public.company_optionals FOR SELECT TO authenticated
  USING (company_id IN (SELECT unnest(public.get_user_company_ids(auth.uid()))));

CREATE POLICY "Users can insert optionals for their company"
  ON public.company_optionals FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT unnest(public.get_user_company_ids(auth.uid()))));

CREATE POLICY "Users can update optionals of their company"
  ON public.company_optionals FOR UPDATE TO authenticated
  USING (company_id IN (SELECT unnest(public.get_user_company_ids(auth.uid()))));

CREATE POLICY "Users can delete optionals of their company"
  ON public.company_optionals FOR DELETE TO authenticated
  USING (company_id IN (SELECT unnest(public.get_user_company_ids(auth.uid()))));

CREATE TRIGGER update_company_optionals_updated_at
  BEFORE UPDATE ON public.company_optionals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();