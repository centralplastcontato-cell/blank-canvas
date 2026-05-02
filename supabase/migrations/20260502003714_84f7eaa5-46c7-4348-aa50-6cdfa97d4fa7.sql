UPDATE public.company_landing_pages
SET theme = jsonb_set(COALESCE(theme, '{}'::jsonb), '{text_color}', '"#ffffff"'::jsonb, true)
WHERE company_id = (SELECT id FROM public.companies WHERE slug = 'espaco-carrossel');