-- =============================================
-- ADD company_id TO CONFIGURATION TABLES
-- =============================================

-- 1. Add company_id to wapi_bot_settings
ALTER TABLE public.wapi_bot_settings 
ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

CREATE INDEX idx_wapi_bot_settings_company_id ON public.wapi_bot_settings(company_id);

-- 2. Add company_id to wapi_bot_questions
ALTER TABLE public.wapi_bot_questions 
ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

CREATE INDEX idx_wapi_bot_questions_company_id ON public.wapi_bot_questions(company_id);

-- 3. Add company_id to wapi_vip_numbers
ALTER TABLE public.wapi_vip_numbers 
ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

CREATE INDEX idx_wapi_vip_numbers_company_id ON public.wapi_vip_numbers(company_id);

-- 4. Add company_id to sales_material_captions
ALTER TABLE public.sales_material_captions 
ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

CREATE INDEX idx_sales_material_captions_company_id ON public.sales_material_captions(company_id);

-- 5. Add company_id to message_templates
ALTER TABLE public.message_templates 
ADD COLUMN company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

CREATE INDEX idx_message_templates_company_id ON public.message_templates(company_id);

-- =============================================
-- MIGRATE EXISTING DATA TO DEFAULT COMPANY
-- =============================================

UPDATE public.wapi_bot_settings
SET company_id = 'a0000000-0000-0000-0000-000000000001'::uuid
WHERE company_id IS NULL;

UPDATE public.wapi_bot_questions
SET company_id = 'a0000000-0000-0000-0000-000000000001'::uuid
WHERE company_id IS NULL;

UPDATE public.wapi_vip_numbers
SET company_id = 'a0000000-0000-0000-0000-000000000001'::uuid
WHERE company_id IS NULL;

UPDATE public.sales_material_captions
SET company_id = 'a0000000-0000-0000-0000-000000000001'::uuid
WHERE company_id IS NULL;

UPDATE public.message_templates
SET company_id = 'a0000000-0000-0000-0000-000000000001'::uuid
WHERE company_id IS NULL;

-- =============================================
-- MAKE company_id NOT NULL
-- =============================================

ALTER TABLE public.wapi_bot_settings ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.wapi_bot_questions ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.wapi_vip_numbers ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.sales_material_captions ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.message_templates ALTER COLUMN company_id SET NOT NULL;

-- =============================================
-- UPDATE RLS POLICIES FOR wapi_bot_settings
-- =============================================

DROP POLICY IF EXISTS "Authenticated users can view bot settings" ON public.wapi_bot_settings;
DROP POLICY IF EXISTS "Admins can manage bot settings" ON public.wapi_bot_settings;

CREATE POLICY "Users can view bot settings from their companies"
ON public.wapi_bot_settings FOR SELECT
USING (company_id = ANY(public.get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

CREATE POLICY "Company admins can manage bot settings"
ON public.wapi_bot_settings FOR ALL
USING (
  is_admin(auth.uid())
  OR (company_id = ANY(public.get_user_company_ids(auth.uid()))
      AND EXISTS (SELECT 1 FROM public.user_companies uc 
                  WHERE uc.user_id = auth.uid() AND uc.company_id = wapi_bot_settings.company_id 
                  AND uc.role IN ('owner', 'admin')))
);

-- =============================================
-- UPDATE RLS POLICIES FOR wapi_bot_questions
-- =============================================

DROP POLICY IF EXISTS "Authenticated users can view bot questions" ON public.wapi_bot_questions;
DROP POLICY IF EXISTS "Admins can manage bot questions" ON public.wapi_bot_questions;

CREATE POLICY "Users can view bot questions from their companies"
ON public.wapi_bot_questions FOR SELECT
USING (company_id = ANY(public.get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

CREATE POLICY "Company admins can manage bot questions"
ON public.wapi_bot_questions FOR ALL
USING (
  is_admin(auth.uid())
  OR (company_id = ANY(public.get_user_company_ids(auth.uid()))
      AND EXISTS (SELECT 1 FROM public.user_companies uc 
                  WHERE uc.user_id = auth.uid() AND uc.company_id = wapi_bot_questions.company_id 
                  AND uc.role IN ('owner', 'admin')))
);

-- =============================================
-- UPDATE RLS POLICIES FOR wapi_vip_numbers
-- =============================================

DROP POLICY IF EXISTS "Authenticated users can view vip numbers" ON public.wapi_vip_numbers;
DROP POLICY IF EXISTS "Authenticated users can manage vip numbers" ON public.wapi_vip_numbers;

CREATE POLICY "Users can view vip numbers from their companies"
ON public.wapi_vip_numbers FOR SELECT
USING (company_id = ANY(public.get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

CREATE POLICY "Company admins can manage vip numbers"
ON public.wapi_vip_numbers FOR ALL
USING (
  is_admin(auth.uid())
  OR (company_id = ANY(public.get_user_company_ids(auth.uid()))
      AND EXISTS (SELECT 1 FROM public.user_companies uc 
                  WHERE uc.user_id = auth.uid() AND uc.company_id = wapi_vip_numbers.company_id 
                  AND uc.role IN ('owner', 'admin')))
);

-- =============================================
-- UPDATE RLS POLICIES FOR sales_material_captions
-- =============================================

DROP POLICY IF EXISTS "Authenticated users can view captions" ON public.sales_material_captions;
DROP POLICY IF EXISTS "Admins can manage captions" ON public.sales_material_captions;

CREATE POLICY "Users can view captions from their companies"
ON public.sales_material_captions FOR SELECT
USING (company_id = ANY(public.get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

CREATE POLICY "Company admins can manage captions"
ON public.sales_material_captions FOR ALL
USING (
  is_admin(auth.uid())
  OR (company_id = ANY(public.get_user_company_ids(auth.uid()))
      AND EXISTS (SELECT 1 FROM public.user_companies uc 
                  WHERE uc.user_id = auth.uid() AND uc.company_id = sales_material_captions.company_id 
                  AND uc.role IN ('owner', 'admin')))
);

-- =============================================
-- UPDATE RLS POLICIES FOR message_templates
-- =============================================

DROP POLICY IF EXISTS "Authenticated users can view templates" ON public.message_templates;
DROP POLICY IF EXISTS "Admins can manage templates" ON public.message_templates;

CREATE POLICY "Users can view templates from their companies"
ON public.message_templates FOR SELECT
USING (company_id = ANY(public.get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

CREATE POLICY "Company admins can manage templates"
ON public.message_templates FOR ALL
USING (
  is_admin(auth.uid())
  OR (company_id = ANY(public.get_user_company_ids(auth.uid()))
      AND EXISTS (SELECT 1 FROM public.user_companies uc 
                  WHERE uc.user_id = auth.uid() AND uc.company_id = message_templates.company_id 
                  AND uc.role IN ('owner', 'admin')))
);