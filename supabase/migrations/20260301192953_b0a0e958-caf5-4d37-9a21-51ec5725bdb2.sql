
-- Create company_contacts table
CREATE TABLE public.company_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  lead_id UUID REFERENCES public.campaign_leads(id) ON DELETE SET NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_contacts ENABLE ROW LEVEL SECURITY;

-- Index for performance
CREATE INDEX idx_company_contacts_company_id ON public.company_contacts(company_id);
CREATE INDEX idx_company_contacts_name ON public.company_contacts(name);

-- SELECT: company members + global admins
CREATE POLICY "Company members can view contacts"
ON public.company_contacts FOR SELECT
TO authenticated
USING (
  public.user_has_company_access(auth.uid(), company_id)
  OR public.is_admin(auth.uid())
);

-- INSERT: company members + global admins
CREATE POLICY "Company members can create contacts"
ON public.company_contacts FOR INSERT
TO authenticated
WITH CHECK (
  public.user_has_company_access(auth.uid(), company_id)
  OR public.is_admin(auth.uid())
);

-- UPDATE: company members + global admins
CREATE POLICY "Company members can update contacts"
ON public.company_contacts FOR UPDATE
TO authenticated
USING (
  public.user_has_company_access(auth.uid(), company_id)
  OR public.is_admin(auth.uid())
);

-- DELETE: company owners/admins + global admins
CREATE POLICY "Company admins can delete contacts"
ON public.company_contacts FOR DELETE
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.user_companies uc
    WHERE uc.user_id = auth.uid()
      AND uc.company_id = company_contacts.company_id
      AND uc.role IN ('owner', 'admin')
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_company_contacts_updated_at
BEFORE UPDATE ON public.company_contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
