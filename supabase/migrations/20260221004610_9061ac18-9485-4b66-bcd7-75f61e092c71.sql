UPDATE company_landing_pages 
SET 
  hero = jsonb_set(hero, '{subtitle}', '"Diversão garantida, atendimento personalizado e momentos mágicos que ficam pra sempre na memória!"'),
  video = jsonb_set(video, '{poster_url}', '"https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/6bc204ae-1311-4c67-bb6b-9ab55dae9d11/photos/1771618696306.jpg"'),
  gallery = jsonb_set(gallery, '{title}', '"Nosso Espaço"')
WHERE company_id = '6bc204ae-1311-4c67-bb6b-9ab55dae9d11';