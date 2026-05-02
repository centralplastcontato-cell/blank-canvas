UPDATE public.company_landing_pages
SET theme = theme 
  || jsonb_build_object('background_color', '#0f172a')
  || jsonb_build_object('primary_color', '#a855f7')
  || jsonb_build_object('secondary_color', '#fb923c')
  || jsonb_build_object('accent_color', '#22c55e')
  || jsonb_build_object('text_color', '#ffffff')
WHERE company_id = (SELECT id FROM public.companies WHERE slug = 'espaco-carrossel');