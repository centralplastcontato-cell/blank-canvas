-- Public function to get company branding by slug (no auth required)
CREATE OR REPLACE FUNCTION public.get_company_branding_by_slug(_slug text)
RETURNS TABLE (name text, logo_url text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT c.name, c.logo_url
  FROM public.companies c
  WHERE c.slug = _slug AND c.is_active = true
  LIMIT 1;
$$;