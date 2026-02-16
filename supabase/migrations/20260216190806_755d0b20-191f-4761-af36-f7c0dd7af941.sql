
-- Add slug column to evaluation_templates
ALTER TABLE public.evaluation_templates ADD COLUMN IF NOT EXISTS slug text;

-- Add slug column to prefesta_templates
ALTER TABLE public.prefesta_templates ADD COLUMN IF NOT EXISTS slug text;

-- Add slug column to contrato_templates
ALTER TABLE public.contrato_templates ADD COLUMN IF NOT EXISTS slug text;

-- RPC: get evaluation template by slugs
CREATE OR REPLACE FUNCTION public.get_evaluation_template_by_slugs(_company_slug text, _template_slug text)
RETURNS TABLE(id uuid, company_id uuid, company_name text, company_logo text, company_slug text, template_name text, description text, questions jsonb, thank_you_message text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT et.id, et.company_id, c.name AS company_name, c.logo_url AS company_logo,
    c.slug AS company_slug, et.name AS template_name, et.description, et.questions, et.thank_you_message
  FROM evaluation_templates et
  JOIN companies c ON c.id = et.company_id
  WHERE c.slug = _company_slug AND et.slug = _template_slug
    AND et.is_active = true AND c.is_active = true
  LIMIT 1;
$$;

-- RPC: get prefesta template by slugs
CREATE OR REPLACE FUNCTION public.get_prefesta_template_by_slugs(_company_slug text, _template_slug text)
RETURNS TABLE(id uuid, company_id uuid, company_name text, company_logo text, company_slug text, template_name text, description text, questions jsonb, thank_you_message text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT pt.id, pt.company_id, c.name AS company_name, c.logo_url AS company_logo,
    c.slug AS company_slug, pt.name AS template_name, pt.description, pt.questions, pt.thank_you_message
  FROM prefesta_templates pt
  JOIN companies c ON c.id = pt.company_id
  WHERE c.slug = _company_slug AND pt.slug = _template_slug
    AND pt.is_active = true AND c.is_active = true
  LIMIT 1;
$$;

-- RPC: get contrato template by slugs
CREATE OR REPLACE FUNCTION public.get_contrato_template_by_slugs(_company_slug text, _template_slug text)
RETURNS TABLE(id uuid, company_id uuid, company_name text, company_logo text, company_slug text, template_name text, description text, questions jsonb, thank_you_message text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT ct.id, ct.company_id, c.name AS company_name, c.logo_url AS company_logo,
    c.slug AS company_slug, ct.name AS template_name, ct.description, ct.questions, ct.thank_you_message
  FROM contrato_templates ct
  JOIN companies c ON c.id = ct.company_id
  WHERE c.slug = _company_slug AND ct.slug = _template_slug
    AND ct.is_active = true AND c.is_active = true
  LIMIT 1;
$$;
