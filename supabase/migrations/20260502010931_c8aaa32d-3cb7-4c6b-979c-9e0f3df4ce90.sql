UPDATE public.company_landing_pages
SET benefits = jsonb_set(
  benefits,
  '{items}',
  (
    SELECT jsonb_agg(
      CASE 
        WHEN item->>'title' = 'Buffet Completo' 
          THEN jsonb_set(item, '{title}', '"Gastronomia"')
        ELSE item
      END
    )
    FROM jsonb_array_elements(benefits->'items') item
  )
)
WHERE company_id = (SELECT id FROM public.companies WHERE slug = 'espaco-carrossel');