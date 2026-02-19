UPDATE company_landing_pages
SET hero = jsonb_set(hero, '{background_images}', '["/images/fachada-unidade-1.jpg", "/images/fachada-unidade-2.jpg"]'::jsonb)
WHERE id = 'fbc21bee-3993-4ace-9cd9-72c8ae8dd1f4';