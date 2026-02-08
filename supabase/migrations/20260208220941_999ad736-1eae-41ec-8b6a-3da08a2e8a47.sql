-- =============================================
-- RLS POLICIES FOR ALL TABLES
-- =============================================

-- 1. PROFILES - Users can read all, update own
CREATE POLICY "Users can view all profiles" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" 
ON public.profiles FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- 2. CAMPAIGN_LEADS - Authenticated users can CRUD
CREATE POLICY "Authenticated users can view leads" 
ON public.campaign_leads FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can insert leads" 
ON public.campaign_leads FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update leads" 
ON public.campaign_leads FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Admins can delete leads" 
ON public.campaign_leads FOR DELETE 
TO authenticated 
USING (public.is_admin(auth.uid()));

-- 3. LEAD_HISTORY - Authenticated users can read, insert
CREATE POLICY "Authenticated users can view lead history" 
ON public.lead_history FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can insert lead history" 
ON public.lead_history FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 4. MESSAGE_TEMPLATES - Authenticated users can read, admins can manage
CREATE POLICY "Authenticated users can view templates" 
ON public.message_templates FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Admins can manage templates" 
ON public.message_templates FOR ALL 
TO authenticated 
USING (public.is_admin(auth.uid()));

-- 5. NOTIFICATIONS - Users can only access own notifications
CREATE POLICY "Users can view own notifications" 
ON public.notifications FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" 
ON public.notifications FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" 
ON public.notifications FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 6. PERMISSION_DEFINITIONS - All authenticated can read
CREATE POLICY "Authenticated users can view permission definitions" 
ON public.permission_definitions FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Admins can manage permission definitions" 
ON public.permission_definitions FOR ALL 
TO authenticated 
USING (public.is_admin(auth.uid()));

-- 7. USER_PERMISSIONS - Users can view, admins can manage
CREATE POLICY "Authenticated users can view permissions" 
ON public.user_permissions FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Admins can manage user permissions" 
ON public.user_permissions FOR ALL 
TO authenticated 
USING (public.is_admin(auth.uid()));

-- 8. PROPOSALS - Authenticated users can CRUD
CREATE POLICY "Authenticated users can view proposals" 
ON public.proposals FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can insert proposals" 
ON public.proposals FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own proposals" 
ON public.proposals FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

-- 9. USER_FILTER_PREFERENCES - Users can manage own preferences
CREATE POLICY "Users can view own filter preferences" 
ON public.user_filter_preferences FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own filter preferences" 
ON public.user_filter_preferences FOR ALL 
TO authenticated 
USING (auth.uid() = user_id);

-- 10. B2B_LEADS - Authenticated users can CRUD
CREATE POLICY "Authenticated users can view b2b leads" 
ON public.b2b_leads FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can insert b2b leads" 
ON public.b2b_leads FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update b2b leads" 
ON public.b2b_leads FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Admins can delete b2b leads" 
ON public.b2b_leads FOR DELETE 
TO authenticated 
USING (public.is_admin(auth.uid()));

-- Allow public insert for B2B lead form (unauthenticated)
CREATE POLICY "Public can submit b2b leads" 
ON public.b2b_leads FOR INSERT 
TO anon 
WITH CHECK (true);

-- 11. SALES_MATERIALS - Authenticated users can read, admins manage
CREATE POLICY "Authenticated users can view sales materials" 
ON public.sales_materials FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Admins can manage sales materials" 
ON public.sales_materials FOR ALL 
TO authenticated 
USING (public.is_admin(auth.uid()));

-- 12. SALES_MATERIAL_CAPTIONS - Authenticated users can read, admins manage
CREATE POLICY "Authenticated users can view captions" 
ON public.sales_material_captions FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Admins can manage captions" 
ON public.sales_material_captions FOR ALL 
TO authenticated 
USING (public.is_admin(auth.uid()));

-- 13. WAPI_INSTANCES - Authenticated users can read, admins manage
CREATE POLICY "Authenticated users can view wapi instances" 
ON public.wapi_instances FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Admins can manage wapi instances" 
ON public.wapi_instances FOR ALL 
TO authenticated 
USING (public.is_admin(auth.uid()));

-- 14. WAPI_CONVERSATIONS - Authenticated users can CRUD
CREATE POLICY "Authenticated users can view conversations" 
ON public.wapi_conversations FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can manage conversations" 
ON public.wapi_conversations FOR ALL 
TO authenticated 
USING (true);

-- 15. WAPI_MESSAGES - Authenticated users can CRUD
CREATE POLICY "Authenticated users can view messages" 
ON public.wapi_messages FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can insert messages" 
ON public.wapi_messages FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 16. WAPI_BOT_SETTINGS - Authenticated users can read, admins manage
CREATE POLICY "Authenticated users can view bot settings" 
ON public.wapi_bot_settings FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Admins can manage bot settings" 
ON public.wapi_bot_settings FOR ALL 
TO authenticated 
USING (public.is_admin(auth.uid()));

-- 17. WAPI_BOT_QUESTIONS - Authenticated users can read, admins manage
CREATE POLICY "Authenticated users can view bot questions" 
ON public.wapi_bot_questions FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Admins can manage bot questions" 
ON public.wapi_bot_questions FOR ALL 
TO authenticated 
USING (public.is_admin(auth.uid()));

-- 18. WAPI_VIP_NUMBERS - Authenticated users can CRUD
CREATE POLICY "Authenticated users can view vip numbers" 
ON public.wapi_vip_numbers FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can manage vip numbers" 
ON public.wapi_vip_numbers FOR ALL 
TO authenticated 
USING (true);