
UPDATE company_landing_pages
SET video = jsonb_build_object(
  'enabled', true,
  'title', 'Conheça o Planeta Divertido',
  'video_url', null,
  'video_type', 'upload',
  'videos', jsonb_build_array(
    jsonb_build_object(
      'name', 'Vídeo do Espaço',
      'video_url', 'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/6bc204ae-1311-4c67-bb6b-9ab55dae9d11/videos/1771618735052.mp4',
      'video_type', 'upload',
      'poster_url', 'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/6bc204ae-1311-4c67-bb6b-9ab55dae9d11/photos/1771618696306.jpg',
      'location', 'Planeta Divertido'
    ),
    jsonb_build_object(
      'name', 'Vídeo Promocional',
      'video_url', 'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/6bc204ae-1311-4c67-bb6b-9ab55dae9d11/videos/1771639331178-7vcqwr4d7kl.mp4',
      'video_type', 'upload',
      'location', 'Planeta Divertido'
    )
  )
),
updated_at = now()
WHERE id = '19e28a5f-bb86-4e48-89a2-d48fde9ae8ad';
