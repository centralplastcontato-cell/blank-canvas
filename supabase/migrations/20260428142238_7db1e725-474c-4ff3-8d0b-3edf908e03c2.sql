UPDATE public.company_landing_pages
SET video = jsonb_set(
  video,
  '{videos}',
  COALESCE(
    (
      SELECT jsonb_agg(elem)
      FROM jsonb_array_elements(video->'videos') AS elem
      WHERE elem IS NOT NULL
        AND jsonb_typeof(elem) = 'object'
        AND COALESCE(elem->>'video_url', '') <> ''
    ),
    '[]'::jsonb
  )
)
WHERE video ? 'videos'
  AND jsonb_typeof(video->'videos') = 'array'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(video->'videos') AS elem
    WHERE elem IS NULL
      OR jsonb_typeof(elem) <> 'object'
      OR COALESCE(elem->>'video_url', '') = ''
  );