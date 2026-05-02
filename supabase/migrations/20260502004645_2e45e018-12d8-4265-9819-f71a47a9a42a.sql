UPDATE public.company_landing_pages lp
SET benefits = jsonb_set(
  benefits,
  '{items}',
  (
    SELECT jsonb_agg(
      CASE WHEN item->>'title' = 'Mobilidade Total'
        THEN jsonb_set(
          jsonb_set(item, '{title}', '"Mobilidade total"'::jsonb),
          '{description}', '"Realizamos toda a estrutura da festa até o local que você escolher"'::jsonb
        )
        ELSE item
      END
    )
    FROM jsonb_array_elements(lp.benefits->'items') AS item
  )
)
WHERE company_id = (SELECT id FROM public.companies WHERE slug = 'espaco-carrossel');