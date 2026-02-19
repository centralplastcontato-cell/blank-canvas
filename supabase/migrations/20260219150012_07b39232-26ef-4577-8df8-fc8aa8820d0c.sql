UPDATE public.company_landing_pages 
SET video = jsonb_set(
  jsonb_set(
    video,
    '{videos,0,poster_url}',
    '"https://knyzkwgdmclcwvzhdmyk.supabase.co/storage/v1/object/public/sales-materials/manchester/collections/1770337337388_0.jpeg"'
  ),
  '{videos,1,poster_url}',
  '"https://knyzkwgdmclcwvzhdmyk.supabase.co/storage/v1/object/public/sales-materials/trujillo/collections/1770337873541_0.jpeg"'
)
WHERE company_id = 'a0000000-0000-0000-0000-000000000001';