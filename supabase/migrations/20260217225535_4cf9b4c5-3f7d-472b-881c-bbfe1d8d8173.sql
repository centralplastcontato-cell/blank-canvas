
-- Create freelancer_templates table
CREATE TABLE public.freelancer_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  name TEXT NOT NULL,
  slug TEXT,
  description TEXT,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  thank_you_message TEXT DEFAULT 'Obrigado pelo seu cadastro! 🎉',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.freelancer_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins can manage freelancer templates"
ON public.freelancer_templates FOR ALL
USING (is_admin(auth.uid()) OR ((company_id = ANY (get_user_company_ids(auth.uid()))) AND (EXISTS (
  SELECT 1 FROM user_companies uc
  WHERE uc.user_id = auth.uid() AND uc.company_id = freelancer_templates.company_id AND uc.role = ANY (ARRAY['owner','admin'])
))))
WITH CHECK (is_admin(auth.uid()) OR ((company_id = ANY (get_user_company_ids(auth.uid()))) AND (EXISTS (
  SELECT 1 FROM user_companies uc
  WHERE uc.user_id = auth.uid() AND uc.company_id = freelancer_templates.company_id AND uc.role = ANY (ARRAY['owner','admin'])
))));

CREATE POLICY "Users can view freelancer templates from their companies"
ON public.freelancer_templates FOR SELECT
USING ((company_id = ANY (get_user_company_ids(auth.uid()))) OR is_admin(auth.uid()));

-- Create freelancer_responses table
CREATE TABLE public.freelancer_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.freelancer_templates(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  respondent_name TEXT,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.freelancer_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit freelancer responses"
ON public.freelancer_responses FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view freelancer responses from their companies"
ON public.freelancer_responses FOR SELECT
USING ((company_id = ANY (get_user_company_ids(auth.uid()))) OR is_admin(auth.uid()));

CREATE POLICY "Company admins can delete freelancer responses"
ON public.freelancer_responses FOR DELETE
USING (is_admin(auth.uid()) OR ((company_id = ANY (get_user_company_ids(auth.uid()))) AND (EXISTS (
  SELECT 1 FROM user_companies uc
  WHERE uc.user_id = auth.uid() AND uc.company_id = freelancer_responses.company_id AND uc.role = ANY (ARRAY['owner','admin'])
))));

-- RPC: get freelancer template publicly by ID
CREATE OR REPLACE FUNCTION public.get_freelancer_template_public(_template_id uuid)
RETURNS TABLE(id uuid, company_id uuid, company_name text, company_logo text, company_slug text, template_name text, description text, questions jsonb, thank_you_message text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT ft.id, ft.company_id, c.name as company_name, c.logo_url as company_logo, c.slug as company_slug,
    ft.name as template_name, ft.description, ft.questions, ft.thank_you_message
  FROM public.freelancer_templates ft
  JOIN public.companies c ON c.id = ft.company_id
  WHERE ft.id = _template_id AND ft.is_active = true AND c.is_active = true
  LIMIT 1;
$$;

-- RPC: get freelancer template by company slug + template slug
CREATE OR REPLACE FUNCTION public.get_freelancer_template_by_slugs(_company_slug text, _template_slug text)
RETURNS TABLE(id uuid, company_id uuid, company_name text, company_logo text, company_slug text, template_name text, description text, questions jsonb, thank_you_message text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT ft.id, ft.company_id, c.name as company_name, c.logo_url as company_logo, c.slug as company_slug,
    ft.name as template_name, ft.description, ft.questions, ft.thank_you_message
  FROM public.freelancer_templates ft
  JOIN public.companies c ON c.id = ft.company_id
  WHERE c.slug = _company_slug AND ft.slug = _template_slug AND ft.is_active = true AND c.is_active = true
  LIMIT 1;
$$;
