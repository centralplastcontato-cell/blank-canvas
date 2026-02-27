
-- ===== SECURITY FIX: Restrict public data exposure on companies, company_events, company_onboarding =====

-- 1. Create RPC to get public company info (non-sensitive fields only)
CREATE OR REPLACE FUNCTION public.get_company_public_info(_company_id uuid)
RETURNS TABLE(id uuid, name text, logo_url text, slug text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT c.id, c.name, c.logo_url, c.slug
  FROM public.companies c
  WHERE c.id = _company_id AND c.is_active = true
  LIMIT 1;
$$;

-- 2. Create RPC to get company with settings (for party control modules)
CREATE OR REPLACE FUNCTION public.get_company_public_with_settings(_company_id uuid)
RETURNS TABLE(id uuid, name text, logo_url text, slug text, settings jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT c.id, c.name, c.logo_url, c.slug, c.settings
  FROM public.companies c
  WHERE c.id = _company_id AND c.is_active = true
  LIMIT 1;
$$;

-- 3. Create RPC to get single event (non-sensitive fields, no total_value/notes)
CREATE OR REPLACE FUNCTION public.get_event_public_info(_event_id uuid)
RETURNS TABLE(id uuid, title text, event_date date, company_id uuid, start_time text, end_time text, lead_id uuid, event_type text, package_name text, guest_count int, status text, unit text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT ce.id, ce.title, ce.event_date, ce.company_id, ce.start_time, ce.end_time, ce.lead_id, ce.event_type, ce.package_name, ce.guest_count, ce.status, ce.unit
  FROM public.company_events ce
  WHERE ce.id = _event_id
  LIMIT 1;
$$;

-- 4. Create RPC to list events for a company (minimal public fields)
CREATE OR REPLACE FUNCTION public.get_events_public_list(_company_id uuid)
RETURNS TABLE(id uuid, title text, event_date date, start_time text, end_time text, event_type text, package_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT ce.id, ce.title, ce.event_date, ce.start_time, ce.end_time, ce.event_type, ce.package_name
  FROM public.company_events ce
  WHERE ce.company_id = _company_id AND ce.status != 'cancelado'
  ORDER BY ce.event_date ASC;
$$;

-- 5. Create RPC for landing page onboarding data (only whatsapp/instagram/units)
CREATE OR REPLACE FUNCTION public.get_onboarding_public_fields(_company_id uuid)
RETURNS TABLE(whatsapp_numbers text[], multiple_units boolean, instagram text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT co.whatsapp_numbers, co.multiple_units, co.instagram
  FROM public.company_onboarding co
  WHERE co.company_id = _company_id
  ORDER BY co.created_at DESC
  LIMIT 1;
$$;

-- 6. Drop overly permissive anon SELECT policies
DROP POLICY IF EXISTS "Anon can view companies for public party control" ON public.companies;
DROP POLICY IF EXISTS "Anon can view events by company_id" ON public.company_events;
DROP POLICY IF EXISTS "Public can read onboarding" ON public.company_onboarding;
DROP POLICY IF EXISTS "Public can update onboarding" ON public.company_onboarding;
