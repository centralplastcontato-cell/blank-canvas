UPDATE company_landing_pages
SET video = jsonb_set(
  video,
  '{videos}',
  (video->'videos')::jsonb #- '{0}' -- placeholder noop
)
WHERE company_id = 'b81fca0b-6cd8-41c6-9cad-9590f1ed5f39';

-- Real update: insert new video at index 2 (after the 2 internal videos)
UPDATE company_landing_pages
SET video = jsonb_set(
  video,
  '{videos}',
  (
    (video->'videos')::jsonb #> '{}'
  ) - 99 -- noop
)
WHERE company_id = 'b81fca0b-6cd8-41c6-9cad-9590f1ed5f39';

UPDATE company_landing_pages
SET video = jsonb_set(
  video,
  '{videos}',
  jsonb_build_array(
    (video->'videos')->0,
    (video->'videos')->1,
    jsonb_build_object(
      'name', 'Nosso Espaço',
      'location', 'Nosso Espaço',
      'video_url', 'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/internal/festa-interna-3.mp4',
      'poster_url', 'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/internal/festa-interna-3-poster.jpg',
      'video_type', 'upload'
    ),
    (video->'videos')->2,
    (video->'videos')->3,
    (video->'videos')->4
  )
)
WHERE company_id = 'b81fca0b-6cd8-41c6-9cad-9590f1ed5f39';