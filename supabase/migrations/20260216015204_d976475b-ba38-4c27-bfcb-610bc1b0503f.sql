
DROP FUNCTION IF EXISTS public.get_prefesta_template_public(uuid);

CREATE OR REPLACE FUNCTION public.get_prefesta_template_public(_template_id uuid)
RETURNS TABLE(
  id uuid,
  company_id uuid,
  company_name text,
  company_logo text,
  company_slug text,
  template_name text,
  description text,
  questions jsonb,
  thank_you_message text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    pt.id,
    pt.company_id,
    c.name as company_name,
    c.logo_url as company_logo,
    c.slug as company_slug,
    pt.name as template_name,
    pt.description,
    pt.questions,
    pt.thank_you_message
  FROM public.prefesta_templates pt
  JOIN public.companies c ON c.id = pt.company_id
  WHERE pt.id = _template_id AND pt.is_active = true AND c.is_active = true
  LIMIT 1;
$$;
