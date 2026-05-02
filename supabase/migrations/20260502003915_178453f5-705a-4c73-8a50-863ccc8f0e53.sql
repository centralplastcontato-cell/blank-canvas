UPDATE public.company_landing_pages
SET benefits = jsonb_set(COALESCE(benefits, '{}'::jsonb), '{subtitle_secondary}', '"Boas lembranças são feitas aqui!"'::jsonb, true)
WHERE company_id = (SELECT id FROM public.companies WHERE slug = 'espaco-carrossel');