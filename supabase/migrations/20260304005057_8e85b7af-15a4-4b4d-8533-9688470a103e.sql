UPDATE company_landing_pages
SET video = jsonb_set(
  jsonb_set(
    video::jsonb,
    '{videos,0}',
    '{"name": "Unidade Manchester", "location": "Manchester", "video_url": "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/sales-materials/manchester/video/1772395930275.mov", "poster_url": "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/sales-materials/manchester/collections/1772395758130_0.jpeg", "video_type": "upload"}'::jsonb
  ),
  '{videos,1}',
  '{"name": "Unidade Trujillo", "location": "Trujillo", "video_url": "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/sales-materials/a0000000-0000-0000-0000-000000000001/Trujillo/1772397314563-j1hoa6i6mm.mov", "poster_url": "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/sales-materials/manchester/collections/1772395759058_1.jpeg", "video_type": "upload"}'::jsonb
),
updated_at = now()
WHERE company_id = 'a0000000-0000-0000-0000-000000000001';