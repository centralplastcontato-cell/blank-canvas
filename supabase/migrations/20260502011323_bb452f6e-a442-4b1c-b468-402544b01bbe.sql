UPDATE public.company_landing_pages
SET video = jsonb_set(video, '{title}', '"Conheça nosso espaço"')
WHERE company_id = (SELECT id FROM public.companies WHERE slug = 'espaco-carrossel');