-- Lista de pacotes do formulário do contratante: os de aniversário (os que a
-- IA usa) primeiro, depois os outros eventos (confraternização, escolar...).
CREATE OR REPLACE FUNCTION public.get_client_data_packages(_token text)
RETURNS TABLE(name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.name
  FROM public.client_data_requests cdr
  JOIN public.company_packages p ON p.company_id = cdr.company_id
  WHERE cdr.token = _token AND p.is_active = true
  ORDER BY p.ai_quote DESC, p.sort_order NULLS LAST, p.name;
$$;
