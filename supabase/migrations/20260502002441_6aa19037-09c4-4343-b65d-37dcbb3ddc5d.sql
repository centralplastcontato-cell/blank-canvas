UPDATE public.company_landing_pages lp
SET gallery = jsonb_set(
  lp.gallery,
  '{units}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN u->>'name' = 'Festas Externas' THEN
          jsonb_set(
            u,
            '{photos}',
            (
              SELECT jsonb_agg(
                CASE
                  WHEN p::text LIKE '%external-3.jpeg%'
                    THEN to_jsonb('https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/external/external-3-v2.jpeg'::text)
                  WHEN p::text LIKE '%external-5.jpeg%'
                    THEN to_jsonb('https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/external/external-5-v2.jpeg'::text)
                  WHEN p::text LIKE '%external-6.jpeg%'
                    THEN to_jsonb('https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/external/external-6-v2.jpeg'::text)
                  WHEN p::text LIKE '%external-7.jpeg%'
                    THEN to_jsonb('https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/external/external-7-v2.jpeg'::text)
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