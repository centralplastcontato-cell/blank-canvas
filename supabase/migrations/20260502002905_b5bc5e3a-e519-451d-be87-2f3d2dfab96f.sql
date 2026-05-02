UPDATE public.company_landing_pages lp
SET gallery = jsonb_set(
  lp.gallery,
  '{units}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN u->>'name' = 'Nosso Espaço' THEN
          jsonb_set(
            u,
            '{photos}',
            (
              SELECT jsonb_agg(
                CASE
                  WHEN p::text LIKE '%08-salao-borboletas.jpeg%'
                    THEN to_jsonb('https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/internal/08-salao-borboletas-v2.jpeg'::text)
                  WHEN p::text LIKE '%03-brinquedao-frontal.jpeg%'
                    THEN to_jsonb('https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/internal/03-brinquedao-frontal-v2.jpeg'::text)
                  WHEN p::text LIKE '%05-brinquedao-arvore.jpeg%'
                    THEN to_jsonb('https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/internal/05-brinquedao-arvore-v2.jpeg'::text)
                  ELSE p
                END
              )
              FROM jsonb_array_elements(u->'photos') AS p
            )
          )
        ELSE u
      END
    )
    FROM jsonb_array_elements(lp.gallery->'units') AS u
  )
)
WHERE lp.company_id = (SELECT id FROM public.companies WHERE slug = 'espaco-carrossel');