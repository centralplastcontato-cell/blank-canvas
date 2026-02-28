
-- RPC to fetch company branding by domain (accessible without auth for login page)
CREATE OR REPLACE FUNCTION public.get_company_branding_by_domain(_domain text)
RETURNS TABLE(name text, logo_url text) 
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT c.name, c.logo_url
  FROM companies c
  WHERE c.domain_canonical = _domain
  LIMIT 1;
$$;

-- Also try partial match fallback
CREATE OR REPLACE FUNCTION public.get_company_branding_by_domain_fuzzy(_base_name text)
RETURNS TABLE(name text, logo_url text)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT c.name, c.logo_url
  FROM companies c
  WHERE c.domain_canonical ILIKE (_base_name || '%')
  LIMIT 1;
$$;
