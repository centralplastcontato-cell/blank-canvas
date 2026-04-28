UPDATE public.company_landing_pages
SET video = jsonb_set(
  video,
  '{videos}',
  (
    SELECT jsonb_agg(v)
    FROM jsonb_array_elements(video->'videos') v
    WHERE v->>'video_url' NOT LIKE '%carrossel-externa-3.mp4%'
  )
)
WHERE company_id = (SELECT id FROM public.companies WHERE slug = 'espaco-carrossel');