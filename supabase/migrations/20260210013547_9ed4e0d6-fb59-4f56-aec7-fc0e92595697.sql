
-- Function to resolve company landing page data by custom domain (public access)
CREATE OR REPLACE FUNCTION public.get_landing_page_by_domain(_domain text)
RETURNS TABLE (
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
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  WHERE c.custom_domain = _domain
    AND c.is_active = true
    AND lp.is_published = true
  LIMIT 1;
$$;

-- Function to resolve company landing page data by slug (public access)
CREATE OR REPLACE FUNCTION public.get_landing_page_by_slug(_slug text)
RETURNS TABLE (
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
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  WHERE c.slug = _slug
    AND c.is_active = true
    AND lp.is_published = true
  LIMIT 1;
$$;
