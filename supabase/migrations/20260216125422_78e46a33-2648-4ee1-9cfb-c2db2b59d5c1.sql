
-- Create contrato_templates table
CREATE TABLE public.contrato_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  name TEXT NOT NULL,
  description TEXT,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  thank_you_message TEXT DEFAULT 'Obrigado por preencher! 🎉 Seus dados foram enviados com sucesso.',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contrato_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins can manage contrato templates"
  ON public.contrato_templates FOR ALL
  USING (is_admin(auth.uid()) OR (company_id = ANY(get_user_company_ids(auth.uid())) AND EXISTS (
    SELECT 1 FROM user_companies uc WHERE uc.user_id = auth.uid() AND uc.company_id = contrato_templates.company_id AND uc.role = ANY(ARRAY['owner','admin'])
  )))
  WITH CHECK (is_admin(auth.uid()) OR (company_id = ANY(get_user_company_ids(auth.uid())) AND EXISTS (
    SELECT 1 FROM user_companies uc WHERE uc.user_id = auth.uid() AND uc.company_id = contrato_templates.company_id AND uc.role = ANY(ARRAY['owner','admin'])
  )));

CREATE POLICY "Users can view contrato templates from their companies"
  ON public.contrato_templates FOR SELECT
  USING (company_id = ANY(get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

-- Create contrato_responses table
CREATE TABLE public.contrato_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.contrato_templates(id),
  company_id UUID NOT NULL REFERENCES public.companies(id),
  event_id UUID REFERENCES public.company_events(id),
  respondent_name TEXT,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contrato_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit contrato responses"
  ON public.contrato_responses FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view contrato responses from their companies"
  ON public.contrato_responses FOR SELECT
  USING (company_id = ANY(get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

CREATE POLICY "Company admins can delete contrato responses"
  ON public.contrato_responses FOR DELETE
  USING (is_admin(auth.uid()) OR (company_id = ANY(get_user_company_ids(auth.uid())) AND EXISTS (
    SELECT 1 FROM user_companies uc WHERE uc.user_id = auth.uid() AND uc.company_id = contrato_responses.company_id AND uc.role = ANY(ARRAY['owner','admin'])
  )));

-- Create public RPC for contrato template
CREATE OR REPLACE FUNCTION public.get_contrato_template_public(_template_id uuid)
RETURNS TABLE(id uuid, company_id uuid, company_name text, company_logo text, company_slug text, template_name text, description text, questions jsonb, thank_you_message text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT 
    ct.id, ct.company_id, c.name as company_name, c.logo_url as company_logo,
    c.slug as company_slug, ct.name as template_name, ct.description, ct.questions, ct.thank_you_message
  FROM public.contrato_templates ct
  JOIN public.companies c ON c.id = ct.company_id
  WHERE ct.id = _template_id AND ct.is_active = true AND c.is_active = true
  LIMIT 1;
$$;
