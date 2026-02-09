-- =============================================
-- ADD company_id TO MAIN TABLES + UPDATE RLS
-- =============================================

-- 1. Add company_id to campaign_leads
ALTER TABLE public.campaign_leads 
ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

CREATE INDEX idx_campaign_leads_company_id ON public.campaign_leads(company_id);

-- 2. Add company_id to wapi_instances
ALTER TABLE public.wapi_instances 
ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

CREATE INDEX idx_wapi_instances_company_id ON public.wapi_instances(company_id);

-- 3. Add company_id to wapi_conversations
ALTER TABLE public.wapi_conversations 
ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

CREATE INDEX idx_wapi_conversations_company_id ON public.wapi_conversations(company_id);

-- =============================================
-- UPDATE RLS POLICIES FOR campaign_leads
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view leads" ON public.campaign_leads;
DROP POLICY IF EXISTS "Authenticated users can insert leads" ON public.campaign_leads;
DROP POLICY IF EXISTS "Authenticated users can update leads" ON public.campaign_leads;
DROP POLICY IF EXISTS "Admins can delete leads" ON public.campaign_leads;

-- New policies with company isolation
CREATE POLICY "Users can view leads from their companies"
ON public.campaign_leads
FOR SELECT
USING (
  company_id IS NULL -- Legacy data (temporary)
  OR company_id = ANY(public.get_user_company_ids(auth.uid()))
  OR is_admin(auth.uid())
);

CREATE POLICY "Users can insert leads in their companies"
ON public.campaign_leads
FOR INSERT
WITH CHECK (
  company_id IS NULL -- Allow legacy inserts temporarily
  OR company_id = ANY(public.get_user_company_ids(auth.uid()))
  OR is_admin(auth.uid())
);

CREATE POLICY "Users can update leads in their companies"
ON public.campaign_leads
FOR UPDATE
USING (
  company_id IS NULL
  OR company_id = ANY(public.get_user_company_ids(auth.uid()))
  OR is_admin(auth.uid())
);

CREATE POLICY "Company admins can delete leads"
ON public.campaign_leads
FOR DELETE
USING (
  is_admin(auth.uid())
  OR (
    company_id = ANY(public.get_user_company_ids(auth.uid()))
    AND EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
      AND uc.company_id = campaign_leads.company_id
      AND uc.role IN ('owner', 'admin')
    )
  )
);

-- =============================================
-- UPDATE RLS POLICIES FOR wapi_instances
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view wapi instances" ON public.wapi_instances;
DROP POLICY IF EXISTS "Admins can manage wapi instances" ON public.wapi_instances;

-- New policies with company isolation
CREATE POLICY "Users can view instances from their companies"
ON public.wapi_instances
FOR SELECT
USING (
  company_id IS NULL -- Legacy data
  OR company_id = ANY(public.get_user_company_ids(auth.uid()))
  OR is_admin(auth.uid())
);

CREATE POLICY "Company admins can insert instances"
ON public.wapi_instances
FOR INSERT
WITH CHECK (
  is_admin(auth.uid())
  OR (
    company_id = ANY(public.get_user_company_ids(auth.uid()))
    AND EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
      AND uc.company_id = wapi_instances.company_id
      AND uc.role IN ('owner', 'admin')
    )
  )
);

CREATE POLICY "Company admins can update instances"
ON public.wapi_instances
FOR UPDATE
USING (
  is_admin(auth.uid())
  OR (
    company_id IS NULL
    OR (
      company_id = ANY(public.get_user_company_ids(auth.uid()))
      AND EXISTS (
        SELECT 1 FROM public.user_companies uc
        WHERE uc.user_id = auth.uid()
        AND uc.company_id = wapi_instances.company_id
        AND uc.role IN ('owner', 'admin')
      )
    )
  )
);

CREATE POLICY "Company admins can delete instances"
ON public.wapi_instances
FOR DELETE
USING (
  is_admin(auth.uid())
  OR (
    company_id = ANY(public.get_user_company_ids(auth.uid()))
    AND EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
      AND uc.company_id = wapi_instances.company_id
      AND uc.role = 'owner'
    )
  )
);

-- =============================================
-- UPDATE RLS POLICIES FOR wapi_conversations
-- =============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view conversations" ON public.wapi_conversations;
DROP POLICY IF EXISTS "Authenticated users can manage conversations" ON public.wapi_conversations;
DROP POLICY IF EXISTS "Admins can delete conversations" ON public.wapi_conversations;

-- New policies with company isolation
CREATE POLICY "Users can view conversations from their companies"
ON public.wapi_conversations
FOR SELECT
USING (
  company_id IS NULL -- Legacy data
  OR company_id = ANY(public.get_user_company_ids(auth.uid()))
  OR is_admin(auth.uid())
);

CREATE POLICY "Users can insert conversations in their companies"
ON public.wapi_conversations
FOR INSERT
WITH CHECK (
  company_id IS NULL
  OR company_id = ANY(public.get_user_company_ids(auth.uid()))
  OR is_admin(auth.uid())
);

CREATE POLICY "Users can update conversations in their companies"
ON public.wapi_conversations
FOR UPDATE
USING (
  company_id IS NULL
  OR company_id = ANY(public.get_user_company_ids(auth.uid()))
  OR is_admin(auth.uid())
);

CREATE POLICY "Company admins can delete conversations"
ON public.wapi_conversations
FOR DELETE
USING (
  is_admin(auth.uid())
  OR (
    company_id = ANY(public.get_user_company_ids(auth.uid()))
    AND EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
      AND uc.company_id = wapi_conversations.company_id
      AND uc.role IN ('owner', 'admin')
    )
  )
);