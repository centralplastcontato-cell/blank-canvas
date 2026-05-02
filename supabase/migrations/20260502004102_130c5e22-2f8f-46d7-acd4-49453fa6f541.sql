UPDATE public.company_landing_pages
SET theme = COALESCE(theme, '{}'::jsonb)
  || jsonb_build_object(
    'primary_color', '#7c3aed',
    'secondary_color', '#f97316',
    'accent_color', '#22c55e',
    'text_color', '#ffffff'
  )
WHERE company_id = (SELECT id FROM public.companies WHERE slug = 'espaco-carrossel');