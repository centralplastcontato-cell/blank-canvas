UPDATE public.company_landing_pages
SET benefits = jsonb_set(
  benefits,
  '{items,1}',
  '{"icon":"Truck","title":"Festa Externa","description":"Levamos nossas Barracas Gastronômicas até você! Cardápios deliciosos e equipe dedicada no local que você escolher: sua casa, condomínio, chácara – onde for!"}'::jsonb
)
WHERE company_id = (SELECT id FROM public.companies WHERE slug = 'espaco-carrossel');