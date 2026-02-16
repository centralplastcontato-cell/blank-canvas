
-- Add slug column to cardapio_templates
ALTER TABLE public.cardapio_templates ADD COLUMN slug text;

-- Create unique index on company_id + slug
CREATE UNIQUE INDEX idx_cardapio_templates_company_slug ON public.cardapio_templates (company_id, slug) WHERE slug IS NOT NULL;

-- Create RPC to resolve cardapio by company slug + template slug
CREATE OR REPLACE FUNCTION public.get_cardapio_template_by_slugs(_company_slug text, _template_slug text)
RETURNS TABLE(id uuid, company_id uuid, company_name text, company_logo text, company_slug text, template_name text, description text, sections jsonb, thank_you_message text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
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
  WHERE c.slug = _company_slug
    AND ct.slug = _template_slug
    AND ct.is_active = true
    AND c.is_active = true
  LIMIT 1;
$$;
