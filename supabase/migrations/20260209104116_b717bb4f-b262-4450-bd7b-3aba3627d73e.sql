-- =============================================
-- MULTI-TENANT STRUCTURE: Companies & User-Companies
-- =============================================

-- 1. Create companies table with hierarchy support
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE, -- URL-friendly identifier
  parent_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  logo_url text,
  is_active boolean NOT NULL DEFAULT true,
  settings jsonb DEFAULT '{}'::jsonb, -- Company-specific settings
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for hierarchy queries
CREATE INDEX idx_companies_parent_id ON public.companies(parent_id);
CREATE INDEX idx_companies_slug ON public.companies(slug);

-- 2. Create user_companies junction table (N:N)
CREATE TABLE public.user_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member'
  is_default boolean NOT NULL DEFAULT false, -- User's default company
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id)
);

-- Indexes for fast lookups
CREATE INDEX idx_user_companies_user_id ON public.user_companies(user_id);
CREATE INDEX idx_user_companies_company_id ON public.user_companies(company_id);

-- 3. Create security definer functions to avoid RLS recursion

-- Function to get user's company IDs (including child companies if parent access)
CREATE OR REPLACE FUNCTION public.get_user_company_ids(_user_id uuid)
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE user_direct_companies AS (
    -- Get companies user has direct access to
    SELECT company_id FROM public.user_companies WHERE user_id = _user_id
  ),
  accessible_companies AS (
    -- Start with direct companies
    SELECT id FROM public.companies WHERE id IN (SELECT company_id FROM user_direct_companies)
    UNION
    -- Add child companies (users with parent access can see children)
    SELECT c.id 
    FROM public.companies c
    INNER JOIN accessible_companies ac ON c.parent_id = ac.id
  )
  SELECT COALESCE(array_agg(id), '{}'::uuid[]) FROM accessible_companies
$$;

-- Function to check if user has access to a specific company
CREATE OR REPLACE FUNCTION public.user_has_company_access(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _company_id = ANY(public.get_user_company_ids(_user_id))
$$;

-- Function to get user's default company
CREATE OR REPLACE FUNCTION public.get_user_default_company(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id 
  FROM public.user_companies 
  WHERE user_id = _user_id AND is_default = true
  LIMIT 1
$$;

-- 4. Enable RLS on new tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_companies ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for companies table

-- Users can view companies they have access to
CREATE POLICY "Users can view accessible companies"
ON public.companies
FOR SELECT
USING (
  id = ANY(public.get_user_company_ids(auth.uid()))
  OR is_admin(auth.uid()) -- Super admins can see all
);

-- Only super admins can create root companies
CREATE POLICY "Super admins can insert companies"
ON public.companies
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- Company owners/admins can update their company
CREATE POLICY "Company admins can update companies"
ON public.companies
FOR UPDATE
USING (
  is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.user_companies uc
    WHERE uc.company_id = id
    AND uc.user_id = auth.uid()
    AND uc.role IN ('owner', 'admin')
  )
);

-- Only super admins can delete companies
CREATE POLICY "Super admins can delete companies"
ON public.companies
FOR DELETE
USING (is_admin(auth.uid()));

-- 6. RLS Policies for user_companies table

-- Users can view their own company memberships + admins see all
CREATE POLICY "Users can view company memberships"
ON public.user_companies
FOR SELECT
USING (
  user_id = auth.uid()
  OR is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.user_companies uc
    WHERE uc.company_id = user_companies.company_id
    AND uc.user_id = auth.uid()
    AND uc.role IN ('owner', 'admin')
  )
);

-- Company owners/admins can add members
CREATE POLICY "Company admins can insert members"
ON public.user_companies
FOR INSERT
WITH CHECK (
  is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.user_companies uc
    WHERE uc.company_id = user_companies.company_id
    AND uc.user_id = auth.uid()
    AND uc.role IN ('owner', 'admin')
  )
);

-- Company owners/admins can update memberships
CREATE POLICY "Company admins can update members"
ON public.user_companies
FOR UPDATE
USING (
  user_id = auth.uid() -- Users can update their own (e.g., set default)
  OR is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.user_companies uc
    WHERE uc.company_id = user_companies.company_id
    AND uc.user_id = auth.uid()
    AND uc.role IN ('owner', 'admin')
  )
);

-- Company owners/admins can remove members
CREATE POLICY "Company admins can delete members"
ON public.user_companies
FOR DELETE
USING (
  is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.user_companies uc
    WHERE uc.company_id = user_companies.company_id
    AND uc.user_id = auth.uid()
    AND uc.role = 'owner' -- Only owners can remove members
  )
);

-- 7. Add updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_companies_updated_at
  BEFORE UPDATE ON public.user_companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();