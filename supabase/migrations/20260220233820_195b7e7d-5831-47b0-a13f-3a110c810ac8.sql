
DROP FUNCTION IF EXISTS public.get_landing_page_by_slug(text);
DROP FUNCTION IF EXISTS public.get_landing_page_by_domain(text);

CREATE FUNCTION public.get_landing_page_by_slug(_slug text)
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
  benefits jsonb,
  theme jsonb,
  footer jsonb
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    c.id, c.name, c.logo_url, c.slug,
    lp.hero, lp.video, lp.gallery, lp.testimonials, lp.offer, lp.benefits, lp.theme, lp.footer
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
  footer jsonb
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    c.id, c.name, c.logo_url, c.slug,
    lp.hero, lp.video, lp.gallery, lp.testimonials, lp.offer, lp.benefits, lp.theme, lp.footer
  FROM public.companies c
  JOIN public.company_landing_pages lp ON lp.company_id = c.id
  WHERE c.domain_canonical = lower(regexp_replace(_domain, '^www\.', ''))
    AND c.is_active = true AND lp.is_published = true
  LIMIT 1;
$function$;
