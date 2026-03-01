
-- =====================================================
-- SECURITY FIX: Restrict anonymous SELECT on sensitive tables
-- Creates 3 RPCs + updates ~10 policies
-- =====================================================

-- 1. event_staff_entries: RPC to strip PIX data
CREATE OR REPLACE FUNCTION public.get_staff_entry_public(_entry_id uuid)
RETURNS TABLE(
  id uuid,
  company_id uuid,
  event_id uuid,
  staff_data jsonb,
  notes text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_row record;
  v_roles jsonb := '[]'::jsonb;
  v_role jsonb;
  v_entry jsonb;
  v_clean_entries jsonb;
BEGIN
  SELECT ese.* INTO v_row FROM public.event_staff_entries ese WHERE ese.id = _entry_id;
  IF NOT FOUND THEN RETURN; END IF;

  FOR v_role IN SELECT * FROM jsonb_array_elements(v_row.staff_data)
  LOOP
    v_clean_entries := '[]'::jsonb;
    FOR v_entry IN SELECT * FROM jsonb_array_elements(v_role->'entries')
    LOOP
      v_clean_entries := v_clean_entries || jsonb_build_object(
        'name', v_entry->>'name',
        'pix_type', '',
        'pix_key', '',
        'value', ''
      );
    END LOOP;
    v_roles := v_roles || jsonb_build_object(
      'roleTitle', v_role->>'roleTitle',
      'entries', v_clean_entries
    );
  END LOOP;

  RETURN QUERY SELECT v_row.id, v_row.company_id, v_row.event_id, v_roles, v_row.notes, v_row.created_at, v_row.updated_at;
END;
$$;

DROP POLICY IF EXISTS "Anon can view staff entry by id" ON public.event_staff_entries;

-- 2. freelancer_evaluations: RPC for public form
CREATE OR REPLACE FUNCTION public.get_evaluations_by_staff_entry(_entry_id uuid)
RETURNS TABLE(
  id uuid,
  company_id uuid,
  event_staff_entry_id uuid,
  event_id uuid,
  freelancer_name text,
  scores jsonb,
  observations text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT fe.id, fe.company_id, fe.event_staff_entry_id, fe.event_id,
         fe.freelancer_name, fe.scores, fe.observations, fe.created_at
  FROM public.freelancer_evaluations fe
  WHERE fe.event_staff_entry_id = _entry_id;
$$;

DROP POLICY IF EXISTS "Anon can view evaluations by staff entry" ON public.freelancer_evaluations;

-- 3. freelancer_availability: Restrict to active schedules
DROP POLICY IF EXISTS "Anon can view availability by schedule" ON public.freelancer_availability;
CREATE POLICY "Anon can view availability by active schedule"
  ON public.freelancer_availability
  FOR SELECT TO anon
  USING (schedule_id IN (SELECT fs.id FROM public.freelancer_schedules fs WHERE fs.is_active = true));

-- 4. company_onboarding: Remove public SELECT/UPDATE
DROP POLICY IF EXISTS "Public can read own onboarding by company" ON public.company_onboarding;
DROP POLICY IF EXISTS "Public can update own onboarding by company" ON public.company_onboarding;

-- 5. lp_bot_settings: RPC (month_options/guest_options are jsonb)
CREATE OR REPLACE FUNCTION public.get_lp_bot_settings_public(_company_id uuid)
RETURNS TABLE(
  welcome_message text,
  month_question text,
  guest_question text,
  name_question text,
  whatsapp_question text,
  completion_message text,
  month_options jsonb,
  guest_options jsonb,
  guest_limit integer,
  guest_limit_message text,
  guest_limit_redirect_name text,
  redirect_completion_message text,
  whatsapp_welcome_template text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT lbs.welcome_message, lbs.month_question, lbs.guest_question,
         lbs.name_question, lbs.whatsapp_question, lbs.completion_message,
         lbs.month_options, lbs.guest_options, lbs.guest_limit,
         lbs.guest_limit_message, lbs.guest_limit_redirect_name,
         lbs.redirect_completion_message, lbs.whatsapp_welcome_template
  FROM public.lp_bot_settings lbs
  WHERE lbs.company_id = _company_id
  LIMIT 1;
$$;

DROP POLICY IF EXISTS "Anyone can view lp_bot_settings" ON public.lp_bot_settings;

-- 6. wapi_bot_settings: Remove company_id IS NULL
DROP POLICY IF EXISTS "Users can view bot settings from their companies" ON public.wapi_bot_settings;
CREATE POLICY "Users can view bot settings from their companies"
  ON public.wapi_bot_settings FOR SELECT TO authenticated
  USING (company_id = ANY(get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "Company admins can manage bot settings" ON public.wapi_bot_settings;
CREATE POLICY "Company admins can manage bot settings"
  ON public.wapi_bot_settings FOR ALL TO authenticated
  USING (is_admin(auth.uid()) OR (company_id = ANY(get_user_company_ids(auth.uid())) AND EXISTS (
    SELECT 1 FROM user_companies uc WHERE uc.user_id = auth.uid() AND uc.company_id = wapi_bot_settings.company_id AND uc.role IN ('owner','admin')
  )))
  WITH CHECK (is_admin(auth.uid()) OR (company_id = ANY(get_user_company_ids(auth.uid())) AND EXISTS (
    SELECT 1 FROM user_companies uc WHERE uc.user_id = auth.uid() AND uc.company_id = wapi_bot_settings.company_id AND uc.role IN ('owner','admin')
  )));

-- 8. wapi_bot_questions: Remove company_id IS NULL
DROP POLICY IF EXISTS "Users can view bot questions from their companies" ON public.wapi_bot_questions;
CREATE POLICY "Users can view bot questions from their companies"
  ON public.wapi_bot_questions FOR SELECT TO authenticated
  USING (company_id = ANY(get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "Company admins can manage bot questions" ON public.wapi_bot_questions;
CREATE POLICY "Company admins can manage bot questions"
  ON public.wapi_bot_questions FOR ALL TO authenticated
  USING (is_admin(auth.uid()) OR (company_id = ANY(get_user_company_ids(auth.uid())) AND EXISTS (
    SELECT 1 FROM user_companies uc WHERE uc.user_id = auth.uid() AND uc.company_id = wapi_bot_questions.company_id AND uc.role IN ('owner','admin')
  )))
  WITH CHECK (is_admin(auth.uid()) OR (company_id = ANY(get_user_company_ids(auth.uid())) AND EXISTS (
    SELECT 1 FROM user_companies uc WHERE uc.user_id = auth.uid() AND uc.company_id = wapi_bot_questions.company_id AND uc.role IN ('owner','admin')
  )));

-- 9. message_templates: Remove company_id IS NULL
DROP POLICY IF EXISTS "Users can view templates from their companies" ON public.message_templates;
CREATE POLICY "Users can view templates from their companies"
  ON public.message_templates FOR SELECT TO authenticated
  USING (company_id = ANY(get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "Company admins can manage templates" ON public.message_templates;
CREATE POLICY "Company admins can manage templates"
  ON public.message_templates FOR ALL TO authenticated
  USING (is_admin(auth.uid()) OR (company_id = ANY(get_user_company_ids(auth.uid())) AND EXISTS (
    SELECT 1 FROM user_companies uc WHERE uc.user_id = auth.uid() AND uc.company_id = message_templates.company_id AND uc.role IN ('owner','admin')
  )))
  WITH CHECK (is_admin(auth.uid()) OR (company_id = ANY(get_user_company_ids(auth.uid())) AND EXISTS (
    SELECT 1 FROM user_companies uc WHERE uc.user_id = auth.uid() AND uc.company_id = message_templates.company_id AND uc.role IN ('owner','admin')
  )));

-- 10. permission_presets: authenticated only
DROP POLICY IF EXISTS "Authenticated users can view permission presets" ON public.permission_presets;
CREATE POLICY "Authenticated users can view permission presets"
  ON public.permission_presets FOR SELECT TO authenticated USING (true);

-- 11. company_units: anon restricted to active
DROP POLICY IF EXISTS "Anon can view units for public pages" ON public.company_units;
CREATE POLICY "Anon can view active units for public pages"
  ON public.company_units FOR SELECT TO anon USING (is_active = true);
