-- =============================================
-- TEMPORARY: Make company_id nullable to allow legacy code to work
-- This will be reverted once all frontend code is updated
-- =============================================

-- Make company_id nullable in tables that have strict typing issues
ALTER TABLE public.lead_history ALTER COLUMN company_id DROP NOT NULL;
ALTER TABLE public.wapi_messages ALTER COLUMN company_id DROP NOT NULL;
ALTER TABLE public.wapi_bot_settings ALTER COLUMN company_id DROP NOT NULL;
ALTER TABLE public.wapi_bot_questions ALTER COLUMN company_id DROP NOT NULL;
ALTER TABLE public.wapi_vip_numbers ALTER COLUMN company_id DROP NOT NULL;
ALTER TABLE public.sales_material_captions ALTER COLUMN company_id DROP NOT NULL;
ALTER TABLE public.message_templates ALTER COLUMN company_id DROP NOT NULL;

-- Update RLS policies to handle NULL company_id (legacy data)
DROP POLICY IF EXISTS "Users can view lead history from their companies" ON public.lead_history;
DROP POLICY IF EXISTS "Users can insert lead history in their companies" ON public.lead_history;

CREATE POLICY "Users can view lead history from their companies"
ON public.lead_history FOR SELECT
USING (
  company_id IS NULL 
  OR company_id = ANY(public.get_user_company_ids(auth.uid()))
  OR is_admin(auth.uid())
);

CREATE POLICY "Users can insert lead history in their companies"
ON public.lead_history FOR INSERT
WITH CHECK (
  company_id IS NULL
  OR company_id = ANY(public.get_user_company_ids(auth.uid()))
  OR is_admin(auth.uid())
);

DROP POLICY IF EXISTS "Users can view messages from their companies" ON public.wapi_messages;
DROP POLICY IF EXISTS "Users can insert messages in their companies" ON public.wapi_messages;
DROP POLICY IF EXISTS "Company admins can delete messages" ON public.wapi_messages;

CREATE POLICY "Users can view messages from their companies"
ON public.wapi_messages FOR SELECT
USING (
  company_id IS NULL 
  OR company_id = ANY(public.get_user_company_ids(auth.uid()))
  OR is_admin(auth.uid())
);

CREATE POLICY "Users can insert messages in their companies"
ON public.wapi_messages FOR INSERT
WITH CHECK (
  company_id IS NULL
  OR company_id = ANY(public.get_user_company_ids(auth.uid()))
  OR is_admin(auth.uid())
);

CREATE POLICY "Company admins can delete messages"
ON public.wapi_messages FOR DELETE
USING (
  is_admin(auth.uid())
  OR (
    company_id IS NULL
    OR (company_id = ANY(public.get_user_company_ids(auth.uid()))
        AND EXISTS (SELECT 1 FROM public.user_companies uc 
                    WHERE uc.user_id = auth.uid() AND uc.company_id = wapi_messages.company_id 
                    AND uc.role IN ('owner', 'admin')))
  )
);

-- Update other table policies similarly
DROP POLICY IF EXISTS "Users can view bot settings from their companies" ON public.wapi_bot_settings;
DROP POLICY IF EXISTS "Company admins can manage bot settings" ON public.wapi_bot_settings;

CREATE POLICY "Users can view bot settings from their companies"
ON public.wapi_bot_settings FOR SELECT
USING (company_id IS NULL OR company_id = ANY(public.get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

CREATE POLICY "Company admins can manage bot settings"
ON public.wapi_bot_settings FOR ALL
USING (
  is_admin(auth.uid())
  OR company_id IS NULL
  OR (company_id = ANY(public.get_user_company_ids(auth.uid()))
      AND EXISTS (SELECT 1 FROM public.user_companies uc 
                  WHERE uc.user_id = auth.uid() AND uc.company_id = wapi_bot_settings.company_id 
                  AND uc.role IN ('owner', 'admin')))
);

DROP POLICY IF EXISTS "Users can view bot questions from their companies" ON public.wapi_bot_questions;
DROP POLICY IF EXISTS "Company admins can manage bot questions" ON public.wapi_bot_questions;

CREATE POLICY "Users can view bot questions from their companies"
ON public.wapi_bot_questions FOR SELECT
USING (company_id IS NULL OR company_id = ANY(public.get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

CREATE POLICY "Company admins can manage bot questions"
ON public.wapi_bot_questions FOR ALL
USING (
  is_admin(auth.uid())
  OR company_id IS NULL
  OR (company_id = ANY(public.get_user_company_ids(auth.uid()))
      AND EXISTS (SELECT 1 FROM public.user_companies uc 
                  WHERE uc.user_id = auth.uid() AND uc.company_id = wapi_bot_questions.company_id 
                  AND uc.role IN ('owner', 'admin')))
);

DROP POLICY IF EXISTS "Users can view vip numbers from their companies" ON public.wapi_vip_numbers;
DROP POLICY IF EXISTS "Company admins can manage vip numbers" ON public.wapi_vip_numbers;

CREATE POLICY "Users can view vip numbers from their companies"
ON public.wapi_vip_numbers FOR SELECT
USING (company_id IS NULL OR company_id = ANY(public.get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

CREATE POLICY "Company admins can manage vip numbers"
ON public.wapi_vip_numbers FOR ALL
USING (
  is_admin(auth.uid())
  OR company_id IS NULL
  OR (company_id = ANY(public.get_user_company_ids(auth.uid()))
      AND EXISTS (SELECT 1 FROM public.user_companies uc 
                  WHERE uc.user_id = auth.uid() AND uc.company_id = wapi_vip_numbers.company_id 
                  AND uc.role IN ('owner', 'admin')))
);

DROP POLICY IF EXISTS "Users can view captions from their companies" ON public.sales_material_captions;
DROP POLICY IF EXISTS "Company admins can manage captions" ON public.sales_material_captions;

CREATE POLICY "Users can view captions from their companies"
ON public.sales_material_captions FOR SELECT
USING (company_id IS NULL OR company_id = ANY(public.get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

CREATE POLICY "Company admins can manage captions"
ON public.sales_material_captions FOR ALL
USING (
  is_admin(auth.uid())
  OR company_id IS NULL
  OR (company_id = ANY(public.get_user_company_ids(auth.uid()))
      AND EXISTS (SELECT 1 FROM public.user_companies uc 
                  WHERE uc.user_id = auth.uid() AND uc.company_id = sales_material_captions.company_id 
                  AND uc.role IN ('owner', 'admin')))
);

DROP POLICY IF EXISTS "Users can view templates from their companies" ON public.message_templates;
DROP POLICY IF EXISTS "Company admins can manage templates" ON public.message_templates;

CREATE POLICY "Users can view templates from their companies"
ON public.message_templates FOR SELECT
USING (company_id IS NULL OR company_id = ANY(public.get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

CREATE POLICY "Company admins can manage templates"
ON public.message_templates FOR ALL
USING (
  is_admin(auth.uid())
  OR company_id IS NULL
  OR (company_id = ANY(public.get_user_company_ids(auth.uid()))
      AND EXISTS (SELECT 1 FROM public.user_companies uc 
                  WHERE uc.user_id = auth.uid() AND uc.company_id = message_templates.company_id 
                  AND uc.role IN ('owner', 'admin')))
);