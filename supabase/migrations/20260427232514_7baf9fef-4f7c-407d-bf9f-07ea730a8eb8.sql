UPDATE company_landing_pages
SET gallery = jsonb_set(
  gallery,
  '{units}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN lower(unit->>'name') LIKE '%externa%' OR lower(unit->>'name') LIKE '%externo%'
          THEN jsonb_set(unit, '{photos}', '[
            "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/external/external-1.jpeg",
            "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/external/external-2.jpeg",
            "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/external/external-3.jpeg",
            "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/external/external-4.jpeg",
            "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/external/external-5.jpeg",
            "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/external/external-6.jpeg",
            "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/external/external-7.jpeg",
            "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/external/external-8.jpeg",
            "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/external/external-9.jpeg",
            "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/external/external-10.jpeg"
          ]'::jsonb)
        ELSE unit
      END
    )
    FROM jsonb_array_elements(gallery->'units') AS unit
  )
)
WHERE company_id = 'b81fca0b-6cd8-41c6-9cad-9590f1ed5f39';