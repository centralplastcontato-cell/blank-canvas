UPDATE public.company_landing_pages
SET theme = theme || jsonb_build_object('background_color', '#dbeafe')
WHERE company_id = (SELECT id FROM public.companies WHERE slug = 'espaco-carrossel');