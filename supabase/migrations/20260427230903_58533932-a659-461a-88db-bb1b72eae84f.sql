
UPDATE company_landing_pages
SET 
  gallery = jsonb_set(
    jsonb_set(
      COALESCE(gallery, '{}'::jsonb),
      '{enabled}', 'true'::jsonb
    ),
    '{units}',
    '[
      {
        "name": "Nosso Espaço",
        "photos": [
          "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/internal/01-fachada.jpeg",
          "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/internal/02-salao.jpeg",
          "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/internal/08-salao-borboletas.jpeg",
          "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/internal/03-brinquedao-frontal.jpeg",
          "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/internal/04-brinquedao-completo.jpeg",
          "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/internal/05-brinquedao-arvore.jpeg",
          "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/internal/06-area-baby.jpeg",
          "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/internal/07-arcade.jpeg",
          "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/internal/09-casa-arvore-externa.jpeg",
          "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/internal/10-pergolado-jardim.jpeg"
        ]
      },
      {
        "name": "Festas Externas",
        "photos": []
      }
    ]'::jsonb
  ),
  video = jsonb_set(
    COALESCE(video, '{}'::jsonb),
    '{videos}',
    '[
      {
        "name": "Nosso Espaço",
        "location": "Nosso Espaço",
        "video_type": "upload",
        "video_url": "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/espaco-carrossel/festa-interna-1.mp4",
        "poster_url": "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/logos/1776892265204.jpg"
      },
      {
        "name": "Nosso Espaço",
        "location": "Nosso Espaço",
        "video_type": "upload",
        "video_url": "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/espaco-carrossel/festa-interna-2.mp4",
        "poster_url": "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/logos/1776892265204.jpg"
      },
      {
        "name": "Festas Externas",
        "location": "Festas Externas",
        "video_type": "upload",
        "video_url": "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/videos/carrossel-externa-1.mp4",
        "poster_url": "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/logos/1776892265204.jpg"
      },
      {
        "name": "Festas Externas",
        "location": "Festas Externas",
        "video_type": "upload",
        "video_url": "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/videos/carrossel-externa-2.mp4",
        "poster_url": "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/logos/1776892265204.jpg"
      },
      {
        "name": "Festas Externas",
        "location": "Festas Externas",
        "video_type": "upload",
        "video_url": "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/videos/carrossel-externa-3.mp4",
        "poster_url": "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/logos/1776892265204.jpg"
      }
    ]'::jsonb
  )
WHERE company_id = 'b81fca0b-6cd8-41c6-9cad-9590f1ed5f39';
