UPDATE public.company_landing_pages 
SET video = '{
  "enabled": true,
  "title": "Conheça a Aventura Kids",
  "video_url": null,
  "video_type": "upload",
  "videos": [
    {
      "name": "Aventura Kids",
      "video_url": "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/eb1776f0-142e-41db-9134-7d352d02c5bd/videos/1772025705892-gsmvwqi3ed4.mp4",
      "video_type": "upload",
      "poster_url": "https://naked-screen-charm.lovable.app/images/fachada-aventura-kids.jpg",
      "location": "Aventura Kids"
    },
    {
      "name": "Aventura Kids - Novidades",
      "video_url": "https://naked-screen-charm.lovable.app/videos/aventura-kids.mp4",
      "video_type": "upload",
      "poster_url": "https://naked-screen-charm.lovable.app/images/fachada-aventura-kids.jpg",
      "location": "Aventura Kids"
    }
  ]
}'::jsonb,
updated_at = now()
WHERE company_id = 'eb1776f0-142e-41db-9134-7d352d02c5bd';