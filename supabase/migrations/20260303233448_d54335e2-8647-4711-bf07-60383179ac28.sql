-- Migrate all gallery URLs from old Supabase project to current one for Castelo
-- First replace the domain for all Manchester and Trujillo photos
UPDATE public.company_landing_pages 
SET gallery = replace(
  replace(
    gallery::text,
    'knyzkwgdmclcwvzhdmyk.supabase.co',
    'rsezgnkfhodltrsewlhz.supabase.co'
  ),
  'trujillo/collections/',
  'manchester/collections/'
)::jsonb
WHERE company_id = 'a0000000-0000-0000-0000-000000000001';

-- Now fix the individual file names (old timestamps -> new timestamps)
-- Manchester photos
UPDATE public.company_landing_pages SET gallery = replace(gallery::text, '1770337337388_0', '1772395758130_0')::jsonb WHERE company_id = 'a0000000-0000-0000-0000-000000000001';
UPDATE public.company_landing_pages SET gallery = replace(gallery::text, '1770337338233_1', '1772395759058_1')::jsonb WHERE company_id = 'a0000000-0000-0000-0000-000000000001';
UPDATE public.company_landing_pages SET gallery = replace(gallery::text, '1770337338780_2', '1772395759570_2')::jsonb WHERE company_id = 'a0000000-0000-0000-0000-000000000001';
UPDATE public.company_landing_pages SET gallery = replace(gallery::text, '1770337339504_3', '1772395760275_3')::jsonb WHERE company_id = 'a0000000-0000-0000-0000-000000000001';
UPDATE public.company_landing_pages SET gallery = replace(gallery::text, '1770337340211_4', '1772395760979_4')::jsonb WHERE company_id = 'a0000000-0000-0000-0000-000000000001';
UPDATE public.company_landing_pages SET gallery = replace(gallery::text, '1770337340867_5', '1772395761599_5')::jsonb WHERE company_id = 'a0000000-0000-0000-0000-000000000001';
UPDATE public.company_landing_pages SET gallery = replace(gallery::text, '1770337341426_6', '1772395762150_6')::jsonb WHERE company_id = 'a0000000-0000-0000-0000-000000000001';
UPDATE public.company_landing_pages SET gallery = replace(gallery::text, '1770337342104_7', '1772395762643_7')::jsonb WHERE company_id = 'a0000000-0000-0000-0000-000000000001';
UPDATE public.company_landing_pages SET gallery = replace(gallery::text, '1770337342975_8', '1772395763126_8')::jsonb WHERE company_id = 'a0000000-0000-0000-0000-000000000001';
UPDATE public.company_landing_pages SET gallery = replace(gallery::text, '1770337343554_9', '1772395763766_9')::jsonb WHERE company_id = 'a0000000-0000-0000-0000-000000000001';

-- Trujillo old file names -> Manchester new file names
UPDATE public.company_landing_pages SET gallery = replace(gallery::text, '1770337873541_0', '1772395758130_0')::jsonb WHERE company_id = 'a0000000-0000-0000-0000-000000000001';
UPDATE public.company_landing_pages SET gallery = replace(gallery::text, '1770337874866_1', '1772395759058_1')::jsonb WHERE company_id = 'a0000000-0000-0000-0000-000000000001';
UPDATE public.company_landing_pages SET gallery = replace(gallery::text, '1770337875484_2', '1772395759570_2')::jsonb WHERE company_id = 'a0000000-0000-0000-0000-000000000001';
UPDATE public.company_landing_pages SET gallery = replace(gallery::text, '1770337876098_3', '1772395760275_3')::jsonb WHERE company_id = 'a0000000-0000-0000-0000-000000000001';
UPDATE public.company_landing_pages SET gallery = replace(gallery::text, '1770337876811_4', '1772395760979_4')::jsonb WHERE company_id = 'a0000000-0000-0000-0000-000000000001';
UPDATE public.company_landing_pages SET gallery = replace(gallery::text, '1770337877432_5', '1772395761599_5')::jsonb WHERE company_id = 'a0000000-0000-0000-0000-000000000001';
UPDATE public.company_landing_pages SET gallery = replace(gallery::text, '1770337878592_6', '1772395762150_6')::jsonb WHERE company_id = 'a0000000-0000-0000-0000-000000000001';
UPDATE public.company_landing_pages SET gallery = replace(gallery::text, '1770337879265_7', '1772395762643_7')::jsonb WHERE company_id = 'a0000000-0000-0000-0000-000000000001';
UPDATE public.company_landing_pages SET gallery = replace(gallery::text, '1770337880085_8', '1772395763126_8')::jsonb WHERE company_id = 'a0000000-0000-0000-0000-000000000001';
UPDATE public.company_landing_pages SET gallery = replace(gallery::text, '1770337880807_9', '1772395763766_9')::jsonb WHERE company_id = 'a0000000-0000-0000-0000-000000000001';