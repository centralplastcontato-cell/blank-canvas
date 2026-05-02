UPDATE public.company_landing_pages lp
SET video = jsonb_set(
  lp.video,
  '{videos}',
  (
    SELECT jsonb_agg(
      CASE
        WHEN v->>'video_url' = 'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/videos/carrossel-externa-1.mp4'
        THEN jsonb_set(
               jsonb_set(v, '{video_url}', to_jsonb('https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/videos/carrossel-externa-1-v2.mp4'::text)),
               '{poster_url}', to_jsonb('https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/videos/carrossel-externa-1-v2-poster.jpg'::text)
             )
        ELSE v
      END
      ORDER BY ord
    )
    FROM jsonb_array_elements(lp.video->'videos') WITH ORDINALITY AS t(v, ord)
  )
)
WHERE lp.company_id = (SELECT id FROM public.companies WHERE slug = 'espaco-carrossel' LIMIT 1);