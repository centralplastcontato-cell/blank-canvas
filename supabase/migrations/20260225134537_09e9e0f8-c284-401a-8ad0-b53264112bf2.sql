
-- 1. Add new columns
ALTER TABLE company_landing_pages
ADD COLUMN IF NOT EXISTS social_proof jsonb DEFAULT '{"enabled": false, "items": [], "text": ""}'::jsonb,
ADD COLUMN IF NOT EXISTS how_it_works jsonb DEFAULT '{"enabled": false, "title": "", "steps": []}'::jsonb;

-- 2. Drop and recreate RPCs with new return types
DROP FUNCTION IF EXISTS public.get_landing_page_by_slug(text);
DROP FUNCTION IF EXISTS public.get_landing_page_by_domain(text);

CREATE FUNCTION public.get_landing_page_by_slug(_slug text)
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
  benefits jsonb,
  theme jsonb,
  footer jsonb,
  social_proof jsonb,
  how_it_works jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    c.id, c.name, c.logo_url, c.slug,
    lp.hero, lp.video, lp.gallery, lp.testimonials, lp.offer, lp.benefits, lp.theme, lp.footer,
    lp.social_proof, lp.how_it_works
  FROM public.companies c
  JOIN public.company_landing_pages lp ON lp.company_id = c.id
  WHERE c.slug = _slug AND c.is_active = true AND lp.is_published = true
  LIMIT 1;
$$;

CREATE FUNCTION public.get_landing_page_by_domain(_domain text)
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
  benefits jsonb,
  theme jsonb,
  footer jsonb,
  social_proof jsonb,
  how_it_works jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    c.id, c.name, c.logo_url, c.slug,
    lp.hero, lp.video, lp.gallery, lp.testimonials, lp.offer, lp.benefits, lp.theme, lp.footer,
    lp.social_proof, lp.how_it_works
  FROM public.companies c
  JOIN public.company_landing_pages lp ON lp.company_id = c.id
  WHERE c.domain_canonical = lower(regexp_replace(_domain, '^www\.', ''))
    AND c.is_active = true AND lp.is_published = true
  LIMIT 1;
$$;
