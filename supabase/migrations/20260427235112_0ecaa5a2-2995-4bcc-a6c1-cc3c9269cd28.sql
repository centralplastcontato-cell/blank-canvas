UPDATE company_landing_pages
SET hero = jsonb_set(
  jsonb_set(hero, '{background_image_url}', '"https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/hero/hero-fachada.jpg"'::jsonb),
  '{background_images}',
  '["https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/hero/hero-fachada.jpg"]'::jsonb
)
WHERE company_id='b81fca0b-6cd8-41c6-9cad-9590f1ed5f39';