
-- Fix mutable search_path on 5 SECURITY DEFINER functions
-- Only adds SET search_path TO 'public', no logic changes

CREATE OR REPLACE FUNCTION public.get_landing_page_by_slug(_slug text)
 RETURNS TABLE(company_id uuid, company_name text, company_logo text, company_slug text, hero jsonb, video jsonb, gallery jsonb, testimonials jsonb, offer jsonb, benefits jsonb, theme jsonb, footer jsonb, social_proof jsonb, how_it_works jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    c.id, c.name, c.logo_url, c.slug,
    lp.hero, lp.video, lp.gallery, lp.testimonials, lp.offer, lp.benefits, lp.theme, lp.footer,
    lp.social_proof, lp.how_it_works
  FROM public.companies c
  JOIN public.company_landing_pages lp ON lp.company_id = c.id
  WHERE c.slug = _slug AND c.is_active = true AND lp.is_published = true
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_company_id_by_slug(_slug text)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT id FROM public.companies WHERE slug = _slug AND is_active = true LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_landing_page_by_domain(_domain text)
 RETURNS TABLE(company_id uuid, company_name text, company_logo text, company_slug text, hero jsonb, video jsonb, gallery jsonb, testimonials jsonb, offer jsonb, benefits jsonb, theme jsonb, footer jsonb, social_proof jsonb, how_it_works jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    c.id, c.name, c.logo_url, c.slug,
    lp.hero, lp.video, lp.gallery, lp.testimonials, lp.offer, lp.benefits, lp.theme, lp.footer,
    lp.social_proof, lp.how_it_works
  FROM public.companies c
  JOIN public.company_landing_pages lp ON lp.company_id = c.id
  WHERE c.domain_canonical = lower(regexp_replace(_domain, '^www\.', ''))
    AND c.is_active = true AND lp.is_published = true
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_company_branding_by_domain(_domain text)
 RETURNS TABLE(name text, logo_url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT c.name, c.logo_url
  FROM companies c
  WHERE c.domain_canonical = _domain
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.get_company_branding_by_domain_fuzzy(_base_name text)
 RETURNS TABLE(name text, logo_url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT c.name, c.logo_url
  FROM companies c
  WHERE c.domain_canonical ILIKE (_base_name || '%')
  LIMIT 1;
$function$;
