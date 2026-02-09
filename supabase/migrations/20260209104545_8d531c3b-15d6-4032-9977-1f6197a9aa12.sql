-- =============================================
-- ADD company_id TO SECONDARY TABLES
-- =============================================

-- 1. Add company_id to lead_history
ALTER TABLE public.lead_history 
ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

CREATE INDEX idx_lead_history_company_id ON public.lead_history(company_id);

-- 2. Add company_id to wapi_messages
ALTER TABLE public.wapi_messages 
ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

CREATE INDEX idx_wapi_messages_company_id ON public.wapi_messages(company_id);

-- 3. Add company_id to sales_materials
ALTER TABLE public.sales_materials 
ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

CREATE INDEX idx_sales_materials_company_id ON public.sales_materials(company_id);

-- =============================================
-- MIGRATE EXISTING DATA TO DEFAULT COMPANY
-- =============================================

-- Update lead_history
UPDATE public.lead_history
SET company_id = 'a0000000-0000-0000-0000-000000000001'::uuid
WHERE company_id IS NULL;

-- Update wapi_messages
UPDATE public.wapi_messages
SET company_id = 'a0000000-0000-0000-0000-000000000001'::uuid
WHERE company_id IS NULL;

-- Update sales_materials
UPDATE public.sales_materials
SET company_id = 'a0000000-0000-0000-0000-000000000001'::uuid
WHERE company_id IS NULL;

-- =============================================
-- MAKE company_id NOT NULL
-- =============================================

ALTER TABLE public.lead_history 
ALTER COLUMN company_id SET NOT NULL;

ALTER TABLE public.wapi_messages 
ALTER COLUMN company_id SET NOT NULL;

ALTER TABLE public.sales_materials 
ALTER COLUMN company_id SET NOT NULL;

-- =============================================
-- UPDATE RLS POLICIES FOR lead_history
-- =============================================

DROP POLICY IF EXISTS "Authenticated users can view lead history" ON public.lead_history;
DROP POLICY IF EXISTS "Authenticated users can insert lead history" ON public.lead_history;

CREATE POLICY "Users can view lead history from their companies"
ON public.lead_history
FOR SELECT
USING (
  company_id = ANY(public.get_user_company_ids(auth.uid()))
  OR is_admin(auth.uid())
);

CREATE POLICY "Users can insert lead history in their companies"
ON public.lead_history
FOR INSERT
WITH CHECK (
  company_id = ANY(public.get_user_company_ids(auth.uid()))
  OR is_admin(auth.uid())
);

-- =============================================
-- UPDATE RLS POLICIES FOR wapi_messages
-- =============================================

DROP POLICY IF EXISTS "Authenticated users can view messages" ON public.wapi_messages;
DROP POLICY IF EXISTS "Authenticated users can insert messages" ON public.wapi_messages;
DROP POLICY IF EXISTS "Admins can delete messages" ON public.wapi_messages;

CREATE POLICY "Users can view messages from their companies"
ON public.wapi_messages
FOR SELECT
USING (
  company_id = ANY(public.get_user_company_ids(auth.uid()))
  OR is_admin(auth.uid())
);

CREATE POLICY "Users can insert messages in their companies"
ON public.wapi_messages
FOR INSERT
WITH CHECK (
  company_id = ANY(public.get_user_company_ids(auth.uid()))
  OR is_admin(auth.uid())
);

CREATE POLICY "Company admins can delete messages"
ON public.wapi_messages
FOR DELETE
USING (
  is_admin(auth.uid())
  OR (
    company_id = ANY(public.get_user_company_ids(auth.uid()))
    AND EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
      AND uc.company_id = wapi_messages.company_id
      AND uc.role IN ('owner', 'admin')
    )
  )
);

-- =============================================
-- UPDATE RLS POLICIES FOR sales_materials
-- =============================================

DROP POLICY IF EXISTS "Authenticated users can view sales materials" ON public.sales_materials;
DROP POLICY IF EXISTS "Admins can manage sales materials" ON public.sales_materials;

CREATE POLICY "Users can view sales materials from their companies"
ON public.sales_materials
FOR SELECT
USING (
  company_id = ANY(public.get_user_company_ids(auth.uid()))
  OR is_admin(auth.uid())
);

CREATE POLICY "Company admins can insert sales materials"
ON public.sales_materials
FOR INSERT
WITH CHECK (
  is_admin(auth.uid())
  OR (
    company_id = ANY(public.get_user_company_ids(auth.uid()))
    AND EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
      AND uc.company_id = sales_materials.company_id
      AND uc.role IN ('owner', 'admin')
    )
  )
);

CREATE POLICY "Company admins can update sales materials"
ON public.sales_materials
FOR UPDATE
USING (
  is_admin(auth.uid())
  OR (
    company_id = ANY(public.get_user_company_ids(auth.uid()))
    AND EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
      AND uc.company_id = sales_materials.company_id
      AND uc.role IN ('owner', 'admin')
    )
  )
);

CREATE POLICY "Company admins can delete sales materials"
ON public.sales_materials
FOR DELETE
USING (
  is_admin(auth.uid())
  OR (
    company_id = ANY(public.get_user_company_ids(auth.uid()))
    AND EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
      AND uc.company_id = sales_materials.company_id
      AND uc.role = 'owner'
    )
  )
);