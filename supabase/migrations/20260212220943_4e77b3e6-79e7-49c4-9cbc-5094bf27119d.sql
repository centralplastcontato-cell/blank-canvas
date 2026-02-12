
-- Add domain_canonical column
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS domain_canonical text;

-- Populate for existing companies
UPDATE public.companies 
SET domain_canonical = lower(regexp_replace(custom_domain, '^www\.', ''))
WHERE custom_domain IS NOT NULL AND domain_canonical IS NULL;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_companies_domain_canonical ON public.companies (domain_canonical) WHERE domain_canonical IS NOT NULL;

-- Update RPC: get_landing_page_by_domain to use canonical matching
CREATE OR REPLACE FUNCTION public.get_landing_page_by_domain(_domain text)
RETURNS TABLE(
  company_id uuid,
  company_name text,
  company_logo text,
  company_slug text,
  hero jsonb,
  video jsonb,
  gallery jsonb,
  testimonials jsonb,
  offer jsonb,
  theme jsonb,
  footer jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    c.id as company_id,
    c.name as company_name,
    c.logo_url as company_logo,
    c.slug as company_slug,
    lp.hero,
    lp.video,
    lp.gallery,
    lp.testimonials,
    lp.offer,
    lp.theme,
    lp.footer
  FROM public.companies c
  JOIN public.company_landing_pages lp ON lp.company_id = c.id
  WHERE c.domain_canonical = lower(regexp_replace(_domain, '^www\.', ''))
    AND c.is_active = true
    AND lp.is_published = true
  LIMIT 1;
$function$;

-- New RPC: get_company_by_domain for tenant resolution without requiring landing page
CREATE OR REPLACE FUNCTION public.get_company_by_domain(_domain text)
RETURNS TABLE(
  id uuid,
  name text,
  slug text,
  logo_url text,
  custom_domain text,
  settings jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT c.id, c.name, c.slug, c.logo_url, c.custom_domain, c.settings
  FROM public.companies c
  WHERE c.domain_canonical = lower(regexp_replace(_domain, '^www\.', ''))
    AND c.is_active = true
  LIMIT 1;
$function$;
