UPDATE public.company_landing_pages
SET how_it_works = jsonb_set(
  how_it_works,
  '{steps,1,description}',
  '"Levamos nosso buffet completo até você! Cardápio delicioso e equipe dedicada no local que escolher: sua casa, condomínio, chácara — onde for!"'::jsonb
),
updated_at = now()
WHERE company_id = 'b81fca0b-6cd8-41c6-9cad-9590f1ed5f39';