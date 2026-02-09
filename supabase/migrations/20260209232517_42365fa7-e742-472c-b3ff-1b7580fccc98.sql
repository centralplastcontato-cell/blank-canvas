
-- Table to store dynamic units per company
CREATE TABLE public.company_units (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Unique constraint: no duplicate slugs per company
ALTER TABLE public.company_units ADD CONSTRAINT company_units_company_slug_unique UNIQUE (company_id, slug);

-- Enable RLS
ALTER TABLE public.company_units ENABLE ROW LEVEL SECURITY;

-- Users can view units from their companies
CREATE POLICY "Users can view units from their companies"
ON public.company_units FOR SELECT
USING (
  company_id = ANY(get_user_company_ids(auth.uid()))
  OR is_admin(auth.uid())
);

-- Company admins can manage units
CREATE POLICY "Company admins can manage units"
ON public.company_units FOR ALL
USING (
  is_admin(auth.uid())
  OR (
    company_id = ANY(get_user_company_ids(auth.uid()))
    AND EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = company_units.company_id
        AND uc.role IN ('owner', 'admin')
    )
  )
)
WITH CHECK (
  is_admin(auth.uid())
  OR (
    company_id = ANY(get_user_company_ids(auth.uid()))
    AND EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = company_units.company_id
        AND uc.role IN ('owner', 'admin')
    )
  )
);

-- Seed existing units for Castelo da Diversão
INSERT INTO public.company_units (company_id, name, slug, sort_order)
VALUES 
  ('a0000000-0000-0000-0000-000000000001', 'Manchester', 'manchester', 0),
  ('a0000000-0000-0000-0000-000000000001', 'Trujillo', 'trujillo', 1);

-- Trigger for updated_at
CREATE TRIGGER update_company_units_updated_at
BEFORE UPDATE ON public.company_units
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
