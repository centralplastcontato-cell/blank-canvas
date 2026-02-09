
-- =====================================================
-- FIX 1: profiles - Restrict SELECT to same-company users or admin
-- =====================================================
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view profiles in their companies"
ON public.profiles FOR SELECT
USING (
  user_id = auth.uid()
  OR is_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.user_companies uc1
    WHERE uc1.user_id = profiles.user_id
      AND uc1.company_id = ANY(get_user_company_ids(auth.uid()))
  )
);

-- =====================================================
-- FIX 2: b2b_leads - Restrict INSERT/UPDATE/SELECT to admin only
-- (b2b_leads has no company_id, so only admin should manage)
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view b2b leads" ON public.b2b_leads;
DROP POLICY IF EXISTS "Authenticated users can insert b2b leads" ON public.b2b_leads;
DROP POLICY IF EXISTS "Authenticated users can update b2b leads" ON public.b2b_leads;

-- Keep public insert for landing page form
-- Keep admin-only for view/update/delete
CREATE POLICY "Admins can view b2b leads"
ON public.b2b_leads FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update b2b leads"
ON public.b2b_leads FOR UPDATE
USING (is_admin(auth.uid()));

-- =====================================================
-- FIX 3: proposals - Restrict SELECT to owner or admin
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can view proposals" ON public.proposals;

CREATE POLICY "Users can view own proposals or admin"
ON public.proposals FOR SELECT
USING (auth.uid() = user_id OR is_admin(auth.uid()));

-- =====================================================
-- FIX 4: campaign_leads - Remove NULL company_id bypass
-- =====================================================
DROP POLICY IF EXISTS "Users can view leads from their companies" ON public.campaign_leads;
DROP POLICY IF EXISTS "Users can insert leads in their companies" ON public.campaign_leads;
DROP POLICY IF EXISTS "Users can update leads in their companies" ON public.campaign_leads;

CREATE POLICY "Users can view leads from their companies"
ON public.campaign_leads FOR SELECT
USING (company_id = ANY(get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

CREATE POLICY "Users can insert leads in their companies"
ON public.campaign_leads FOR INSERT
WITH CHECK (company_id = ANY(get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

CREATE POLICY "Users can update leads in their companies"
ON public.campaign_leads FOR UPDATE
USING (company_id = ANY(get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

-- =====================================================
-- FIX 5: wapi_messages - Remove NULL company_id bypass
-- =====================================================
DROP POLICY IF EXISTS "Users can view messages from their companies" ON public.wapi_messages;
DROP POLICY IF EXISTS "Users can insert messages in their companies" ON public.wapi_messages;
DROP POLICY IF EXISTS "Company admins can delete messages" ON public.wapi_messages;

CREATE POLICY "Users can view messages from their companies"
ON public.wapi_messages FOR SELECT
USING (company_id = ANY(get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

CREATE POLICY "Users can insert messages in their companies"
ON public.wapi_messages FOR INSERT
WITH CHECK (company_id = ANY(get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

CREATE POLICY "Company admins can delete messages"
ON public.wapi_messages FOR DELETE
USING (
  is_admin(auth.uid())
  OR (
    company_id = ANY(get_user_company_ids(auth.uid()))
    AND EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = wapi_messages.company_id
        AND uc.role IN ('owner', 'admin')
    )
  )
);

-- =====================================================
-- FIX 6: wapi_conversations - Remove NULL company_id bypass
-- =====================================================
DROP POLICY IF EXISTS "Users can view conversations from their companies" ON public.wapi_conversations;
DROP POLICY IF EXISTS "Users can insert conversations in their companies" ON public.wapi_conversations;
DROP POLICY IF EXISTS "Users can update conversations in their companies" ON public.wapi_conversations;

CREATE POLICY "Users can view conversations from their companies"
ON public.wapi_conversations FOR SELECT
USING (company_id = ANY(get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

CREATE POLICY "Users can insert conversations in their companies"
ON public.wapi_conversations FOR INSERT
WITH CHECK (company_id = ANY(get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

CREATE POLICY "Users can update conversations in their companies"
ON public.wapi_conversations FOR UPDATE
USING (company_id = ANY(get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

-- =====================================================
-- FIX 7: wapi_instances - Remove NULL company_id bypass from UPDATE/SELECT
-- =====================================================
DROP POLICY IF EXISTS "Users can view instances from their companies" ON public.wapi_instances;
DROP POLICY IF EXISTS "Company admins can update instances" ON public.wapi_instances;

CREATE POLICY "Users can view instances from their companies"
ON public.wapi_instances FOR SELECT
USING (company_id = ANY(get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

CREATE POLICY "Company admins can update instances"
ON public.wapi_instances FOR UPDATE
USING (
  is_admin(auth.uid())
  OR (
    company_id = ANY(get_user_company_ids(auth.uid()))
    AND EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = wapi_instances.company_id
        AND uc.role IN ('owner', 'admin')
    )
  )
);

-- =====================================================
-- BONUS: lead_history - Remove NULL company_id bypass
-- =====================================================
DROP POLICY IF EXISTS "Users can view lead history from their companies" ON public.lead_history;
DROP POLICY IF EXISTS "Users can insert lead history in their companies" ON public.lead_history;

CREATE POLICY "Users can view lead history from their companies"
ON public.lead_history FOR SELECT
USING (company_id = ANY(get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

CREATE POLICY "Users can insert lead history in their companies"
ON public.lead_history FOR INSERT
WITH CHECK (company_id = ANY(get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));
