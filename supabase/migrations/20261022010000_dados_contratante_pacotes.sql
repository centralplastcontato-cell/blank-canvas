-- Formulário do contratante (/dados/:token): a cliente escolhe o pacote que
-- fechou e informa os convidados. A lista de pacotes ativos do buffet vem por
-- aqui (a página é pública: só nomes, e só com um token válido).
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
  ORDER BY p.sort_order NULLS LAST, p.name;
$$;
GRANT EXECUTE ON FUNCTION public.get_client_data_packages(text) TO anon, authenticated;
