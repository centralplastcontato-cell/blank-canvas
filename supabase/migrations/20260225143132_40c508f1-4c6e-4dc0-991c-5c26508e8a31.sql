UPDATE company_landing_pages
SET hero = jsonb_set(
  hero,
  '{background_images}',
  '["https://naked-screen-charm.lovable.app/images/fachada-aventura-kids.jpg", "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/eb1776f0-142e-41db-9134-7d352d02c5bd/photos/1772025495578-pi3s4wk6a2l.png", "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/eb1776f0-142e-41db-9134-7d352d02c5bd/photos/1772025510811-5ncyfjkgo5b.jpeg"]'::jsonb
)
WHERE company_id = 'eb1776f0-142e-41db-9134-7d352d02c5bd';