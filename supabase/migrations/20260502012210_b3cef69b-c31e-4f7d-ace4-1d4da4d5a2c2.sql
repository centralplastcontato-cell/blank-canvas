UPDATE public.company_landing_pages
SET theme = jsonb_set(theme, '{background_color}', '"#93c5fd"')
WHERE company_id = (SELECT id FROM public.companies WHERE slug='espaco-carrossel');