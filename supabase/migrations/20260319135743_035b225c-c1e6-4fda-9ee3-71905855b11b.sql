UPDATE public.company_landing_pages
SET video = jsonb_set(
  video,
  '{videos,1,poster_url}',
  '"https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/eb1776f0-142e-41db-9134-7d352d02c5bd/migrated/logo-aventura-kids.png"'::jsonb
),
updated_at = now()
WHERE company_id = 'eb1776f0-142e-41db-9134-7d352d02c5bd';