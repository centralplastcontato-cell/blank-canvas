UPDATE public.company_landing_pages
SET gallery = jsonb_set(gallery, '{title}', '"Momentos Inesquecíveis no Espaço Carrossel"')
WHERE company_id = (SELECT id FROM public.companies WHERE slug = 'espaco-carrossel');