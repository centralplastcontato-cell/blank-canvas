UPDATE public.company_landing_pages
SET theme = jsonb_set(theme, '{background_color}', '"#d8b4fe"')
WHERE company_id = 'b81fca0b-6cd8-41c6-9cad-9590f1ed5f39';