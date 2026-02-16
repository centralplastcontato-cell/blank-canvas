
-- Evaluation templates (managed by buffet)
CREATE TABLE public.evaluation_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  thank_you_message text DEFAULT 'Obrigado pela sua avaliação! 🎉',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.evaluation_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view templates from their companies"
  ON public.evaluation_templates FOR SELECT
  USING (company_id = ANY(get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

CREATE POLICY "Company admins can manage templates"
  ON public.evaluation_templates FOR ALL
  USING (is_admin(auth.uid()) OR (company_id = ANY(get_user_company_ids(auth.uid())) AND EXISTS (
    SELECT 1 FROM user_companies uc WHERE uc.user_id = auth.uid() AND uc.company_id = evaluation_templates.company_id AND uc.role = ANY(ARRAY['owner','admin'])
  )))
  WITH CHECK (is_admin(auth.uid()) OR (company_id = ANY(get_user_company_ids(auth.uid())) AND EXISTS (
    SELECT 1 FROM user_companies uc WHERE uc.user_id = auth.uid() AND uc.company_id = evaluation_templates.company_id AND uc.role = ANY(ARRAY['owner','admin'])
  )));

-- Evaluation responses (public, no auth required)
CREATE TABLE public.evaluation_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid NOT NULL REFERENCES public.evaluation_templates(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.company_events(id) ON DELETE SET NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  respondent_name text,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  overall_score numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.evaluation_responses ENABLE ROW LEVEL SECURITY;

-- Public can submit responses (no auth needed)
CREATE POLICY "Anyone can submit evaluation responses"
  ON public.evaluation_responses FOR INSERT
  WITH CHECK (true);

-- Company members can view responses
CREATE POLICY "Users can view responses from their companies"
  ON public.evaluation_responses FOR SELECT
  USING (company_id = ANY(get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

-- Company admins can delete responses
CREATE POLICY "Company admins can delete responses"
  ON public.evaluation_responses FOR DELETE
  USING (is_admin(auth.uid()) OR (company_id = ANY(get_user_company_ids(auth.uid())) AND EXISTS (
    SELECT 1 FROM user_companies uc WHERE uc.user_id = auth.uid() AND uc.company_id = evaluation_responses.company_id AND uc.role = ANY(ARRAY['owner','admin'])
  )));

-- Trigger for updated_at
CREATE TRIGGER update_evaluation_templates_updated_at
  BEFORE UPDATE ON public.evaluation_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RPC to get template data publicly (for the public form)
CREATE OR REPLACE FUNCTION public.get_evaluation_template_public(_template_id uuid)
RETURNS TABLE(
  id uuid, 
  company_name text, 
  company_logo text, 
  template_name text, 
  description text, 
  questions jsonb, 
  thank_you_message text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT 
    et.id,
    c.name as company_name,
    c.logo_url as company_logo,
    et.name as template_name,
    et.description,
    et.questions,
    et.thank_you_message
  FROM public.evaluation_templates et
  JOIN public.companies c ON c.id = et.company_id
  WHERE et.id = _template_id AND et.is_active = true AND c.is_active = true
  LIMIT 1;
$$;
