UPDATE public.company_landing_pages 
SET hero = hero || '{"mascot_image_url": "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/84f6a011-a1e1-4a2a-96f6-38da92a319ce/mascot-elephant.png"}'::jsonb
WHERE company_id = '84f6a011-a1e1-4a2a-96f6-38da92a319ce';