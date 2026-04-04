CREATE TABLE public.company_sellers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_company_sellers_company ON public.company_sellers(company_id);

ALTER TABLE public.company_sellers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sellers of their companies"
ON public.company_sellers FOR SELECT TO authenticated
USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can manage sellers of their companies"
ON public.company_sellers FOR INSERT TO authenticated
WITH CHECK (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can update sellers of their companies"
ON public.company_sellers FOR UPDATE TO authenticated
USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can delete sellers of their companies"
ON public.company_sellers FOR DELETE TO authenticated
USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE TRIGGER update_company_sellers_updated_at
BEFORE UPDATE ON public.company_sellers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();