UPDATE public.company_landing_pages
SET benefits = jsonb_set(
  benefits,
  '{items}',
  (benefits->'items') || jsonb_build_array(
    jsonb_build_object(
      'icon', 'TreePine',
      'title', 'Arvorismo e Tirolesa',
      'description', 'Mais emoção para a sua festa'
    )
  )
)
WHERE company_id = (SELECT id FROM public.companies WHERE slug = 'espaco-carrossel');