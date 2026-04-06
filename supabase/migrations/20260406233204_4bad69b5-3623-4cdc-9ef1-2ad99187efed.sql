
CREATE TABLE public.package_price_tiers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID NOT NULL REFERENCES public.company_packages(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  guest_count INTEGER NOT NULL,
  day_type TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(package_id, guest_count, day_type)
);

CREATE INDEX idx_package_price_tiers_package ON public.package_price_tiers(package_id);
CREATE INDEX idx_package_price_tiers_company ON public.package_price_tiers(company_id);

ALTER TABLE public.package_price_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view price tiers of their companies"
ON public.package_price_tiers FOR SELECT TO authenticated
USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can insert price tiers for their companies"
ON public.package_price_tiers FOR INSERT TO authenticated
WITH CHECK (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can update price tiers of their companies"
ON public.package_price_tiers FOR UPDATE TO authenticated
USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can delete price tiers of their companies"
ON public.package_price_tiers FOR DELETE TO authenticated
USING (company_id = ANY(public.get_user_company_ids(auth.uid())));
