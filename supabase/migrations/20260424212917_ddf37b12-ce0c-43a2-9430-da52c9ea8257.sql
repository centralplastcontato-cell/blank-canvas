UPDATE public.company_landing_pages
SET 
  video = jsonb_set(
    jsonb_set(video, '{title}', '"Conheça Nossos Espaços"'::jsonb),
    '{videos}',
    (video->'videos') || jsonb_build_array(
      jsonb_build_object(
        'name', 'Festa Interna - Espaço Carrossel',
        'location', 'Festa Interna',
        'video_type', 'upload',
        'video_url', 'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/espaco-carrossel/festa-interna-1.mp4',
        'poster_url', 'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/logos/1776892265204.jpg'
      ),
      jsonb_build_object(
        'name', 'Festa Interna - Espaço Carrossel',
        'location', 'Festa Interna',
        'video_type', 'upload',
        'video_url', 'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/espaco-carrossel/festa-interna-2.mp4',
        'poster_url', 'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/logos/1776892265204.jpg'
      )
    )
  ),
  updated_at = now()
WHERE company_id = 'b81fca0b-6cd8-41c6-9cad-9590f1ed5f39';