
-- Pre-festa templates (same pattern as evaluation_templates)
CREATE TABLE public.prefesta_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  name TEXT NOT NULL,
  description TEXT,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  thank_you_message TEXT DEFAULT 'Obrigado por preencher! 🎉 Estamos preparando tudo para a sua festa!',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.prefesta_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company admins can manage prefesta templates"
ON public.prefesta_templates FOR ALL TO authenticated
USING (
  is_admin(auth.uid()) OR (
    company_id = ANY(get_user_company_ids(auth.uid())) AND
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = prefesta_templates.company_id
        AND uc.role IN ('owner', 'admin')
    )
  )
)
WITH CHECK (
  is_admin(auth.uid()) OR (
    company_id = ANY(get_user_company_ids(auth.uid())) AND
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = prefesta_templates.company_id
        AND uc.role IN ('owner', 'admin')
    )
  )
);

CREATE POLICY "Users can view prefesta templates from their companies"
ON public.prefesta_templates FOR SELECT TO authenticated
USING (company_id = ANY(get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

CREATE TRIGGER update_prefesta_templates_updated_at
BEFORE UPDATE ON public.prefesta_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Pre-festa responses (same pattern as evaluation_responses)
CREATE TABLE public.prefesta_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.prefesta_templates(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  event_id UUID REFERENCES public.company_events(id),
  respondent_name TEXT,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.prefesta_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit prefesta responses"
ON public.prefesta_responses FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can view prefesta responses from their companies"
ON public.prefesta_responses FOR SELECT TO authenticated
USING (company_id = ANY(get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

CREATE POLICY "Company admins can delete prefesta responses"
ON public.prefesta_responses FOR DELETE TO authenticated
USING (
  is_admin(auth.uid()) OR (
    company_id = ANY(get_user_company_ids(auth.uid())) AND
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = prefesta_responses.company_id
        AND uc.role IN ('owner', 'admin')
    )
  )
);

-- Public RPC to fetch template without auth (same pattern as get_evaluation_template_public)
CREATE OR REPLACE FUNCTION public.get_prefesta_template_public(_template_id uuid)
RETURNS TABLE(
  id uuid,
  company_id uuid,
  company_name text,
  company_logo text,
  template_name text,
  description text,
  questions jsonb,
  thank_you_message text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    pt.id,
    pt.company_id,
    c.name as company_name,
    c.logo_url as company_logo,
    pt.name as template_name,
    pt.description,
    pt.questions,
    pt.thank_you_message
  FROM public.prefesta_templates pt
  JOIN public.companies c ON c.id = pt.company_id
  WHERE pt.id = _template_id AND pt.is_active = true AND c.is_active = true
  LIMIT 1;
$$;
