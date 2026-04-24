UPDATE public.company_landing_pages
SET 
  video = '{
    "enabled": true,
    "title": "Festa Externa em Ação",
    "videos": [
      {
        "name": "Festa Externa - Espaço Carrossel",
        "video_url": "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/videos/carrossel-externa-1.mp4",
        "video_type": "upload",
        "poster_url": "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/logos/1776892265204.jpg",
        "location": "Festa Externa"
      },
      {
        "name": "Festa Externa - Espaço Carrossel",
        "video_url": "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/videos/carrossel-externa-2.mp4",
        "video_type": "upload",
        "poster_url": "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/logos/1776892265204.jpg",
        "location": "Festa Externa"
      }
    ]
  }'::jsonb,
  updated_at = now()
WHERE company_id = 'b81fca0b-6cd8-41c6-9cad-9590f1ed5f39';