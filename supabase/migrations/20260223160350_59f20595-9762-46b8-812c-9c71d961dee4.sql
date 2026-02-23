
UPDATE company_landing_pages
SET video = jsonb_set(
  video,
  '{videos,1,poster_url}',
  '"https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/6bc204ae-1311-4c67-bb6b-9ab55dae9d11/photos/1771618697238.jpg"'
),
updated_at = now()
WHERE id = '19e28a5f-bb86-4e48-89a2-d48fde9ae8ad';
