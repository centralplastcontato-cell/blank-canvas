
DROP FUNCTION IF EXISTS public.get_evaluation_template_public(uuid);

CREATE OR REPLACE FUNCTION public.get_evaluation_template_public(_template_id uuid)
 RETURNS TABLE(id uuid, company_id uuid, company_name text, company_logo text, template_name text, description text, questions jsonb, thank_you_message text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT 
    et.id,
    et.company_id,
    c.name as company_name,
    c.logo_url as company_logo,
    et.name as template_name,
    et.description,
    et.questions,
    et.thank_you_message
  FROM public.evaluation_templates et
  JOIN public.companies c ON c.id = et.company_id
  WHERE et.id = _template_id AND et.is_active = true AND c.is_active = true
  LIMIT 1;
$$;
