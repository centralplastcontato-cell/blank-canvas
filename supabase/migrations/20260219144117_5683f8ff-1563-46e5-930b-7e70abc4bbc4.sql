UPDATE public.company_landing_pages SET video = jsonb_build_object(
  'enabled', true,
  'title', 'Conheça nossos espaços',
  'video_url', null,
  'video_type', 'upload',
  'videos', jsonb_build_array(
    jsonb_build_object('name', 'Unidade Manchester', 'video_url', 'https://knyzkwgdmclcwvzhdmyk.supabase.co/storage/v1/object/public/sales-materials/manchester/video/1770322761191.mp4', 'video_type', 'upload', 'location', 'Manchester'),
    jsonb_build_object('name', 'Unidade Trujillo', 'video_url', 'https://knyzkwgdmclcwvzhdmyk.supabase.co/storage/v1/object/public/sales-materials/manchester/video/1770322356590.mp4', 'video_type', 'upload', 'location', 'Trujillo')
  )
) WHERE company_id = 'a0000000-0000-0000-0000-000000000001';