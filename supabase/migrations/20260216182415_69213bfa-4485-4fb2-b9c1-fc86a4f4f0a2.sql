
-- Create cardapio_templates table
CREATE TABLE public.cardapio_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  name text NOT NULL,
  description text,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  thank_you_message text DEFAULT 'Obrigado por enviar suas escolhas! 🎉',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.cardapio_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins can manage cardapio templates"
ON public.cardapio_templates FOR ALL
USING (
  is_admin(auth.uid()) OR (
    company_id = ANY(get_user_company_ids(auth.uid())) AND EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.user_id = auth.uid() AND uc.company_id = cardapio_templates.company_id
      AND uc.role IN ('owner', 'admin')
    )
  )
)
WITH CHECK (
  is_admin(auth.uid()) OR (
    company_id = ANY(get_user_company_ids(auth.uid())) AND EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.user_id = auth.uid() AND uc.company_id = cardapio_templates.company_id
      AND uc.role IN ('owner', 'admin')
    )
  )
);

CREATE POLICY "Users can view cardapio templates from their companies"
ON public.cardapio_templates FOR SELECT
USING (company_id = ANY(get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

-- Create cardapio_responses table
CREATE TABLE public.cardapio_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id uuid NOT NULL REFERENCES public.cardapio_templates(id),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  event_id uuid REFERENCES public.company_events(id),
  respondent_name text,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.cardapio_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit cardapio responses"
ON public.cardapio_responses FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view cardapio responses from their companies"
ON public.cardapio_responses FOR SELECT
USING (company_id = ANY(get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

CREATE POLICY "Company admins can delete cardapio responses"
ON public.cardapio_responses FOR DELETE
USING (
  is_admin(auth.uid()) OR (
    company_id = ANY(get_user_company_ids(auth.uid())) AND EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.user_id = auth.uid() AND uc.company_id = cardapio_responses.company_id
      AND uc.role IN ('owner', 'admin')
    )
  )
);

-- Create public RPC for fetching cardapio template
CREATE OR REPLACE FUNCTION public.get_cardapio_template_public(_template_id uuid)
RETURNS TABLE (
  id uuid,
  company_id uuid,
  company_name text,
  company_logo text,
  company_slug text,
  template_name text,
  description text,
  sections jsonb,
  thank_you_message text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ct.id,
    ct.company_id,
    c.name AS company_name,
    c.logo_url AS company_logo,
    c.slug AS company_slug,
    ct.name AS template_name,
    ct.description,
    ct.sections,
    ct.thank_you_message
  FROM cardapio_templates ct
  JOIN companies c ON c.id = ct.company_id
  WHERE ct.id = _template_id AND ct.is_active = true;
$$;
