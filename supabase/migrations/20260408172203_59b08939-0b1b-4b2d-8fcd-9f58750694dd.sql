UPDATE public.company_landing_pages
SET video = '{"enabled":true,"title":"Conheça o Mega Magic por Dentro","video_url":"/videos/megamagic-tour.mp4","video_type":"upload","poster_url":"/videos/megamagic-thumbnail.jpg","videos":[{"name":"Mega Magic","video_url":"/videos/megamagic-tour.mp4","video_type":"upload","poster_url":"/videos/megamagic-thumbnail.jpg","location":"São Paulo"}]}'::jsonb,
    updated_at = now()
WHERE company_id = '84f6a011-a1e1-4a2a-96f6-38da92a319ce';