UPDATE public.company_landing_pages
SET video = jsonb_set(
  video,
  '{videos}',
  (video->'videos') || jsonb_build_array(
    jsonb_build_object(
      'location', 'Festa Externa',
      'name', 'Festa Externa - Espaço Carrossel',
      'poster_url', 'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/logos/1776892265204.jpg',
      'video_type', 'upload',
      'video_url', 'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/videos/carrossel-externa-3.mp4'
    )
  )
)
WHERE company_id = 'b81fca0b-6cd8-41c6-9cad-9590f1ed5f39';