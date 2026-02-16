
-- Create company_packages table
CREATE TABLE public.company_packages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_packages ENABLE ROW LEVEL SECURITY;

-- SELECT for company members
CREATE POLICY "Users can view packages from their companies"
ON public.company_packages FOR SELECT
USING (company_id = ANY(get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

-- ALL for company admins/owners
CREATE POLICY "Company admins can manage packages"
ON public.company_packages FOR ALL
USING (
  is_admin(auth.uid()) OR (
    company_id = ANY(get_user_company_ids(auth.uid()))
    AND EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = company_packages.company_id
        AND uc.role = ANY(ARRAY['owner','admin'])
    )
  )
)
WITH CHECK (
  is_admin(auth.uid()) OR (
    company_id = ANY(get_user_company_ids(auth.uid()))
    AND EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = company_packages.company_id
        AND uc.role = ANY(ARRAY['owner','admin'])
    )
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_company_packages_updated_at
BEFORE UPDATE ON public.company_packages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
