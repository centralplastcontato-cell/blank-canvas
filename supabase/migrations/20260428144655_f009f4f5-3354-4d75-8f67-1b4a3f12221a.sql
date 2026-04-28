UPDATE company_landing_pages
SET benefits = jsonb_set(
  benefits,
  '{items}',
  (benefits->'items') || '[
    {"icon": "MapPin", "title": "Localização Privilegiada", "description": "Fácil acesso e estacionamento para você e seus convidados"},
    {"icon": "Gift", "title": "Pacotes Personalizados", "description": "Planos sob medida para o tamanho e estilo da sua festa"}
  ]'::jsonb
)
WHERE company_id = (SELECT id FROM companies WHERE slug = 'espaco-carrossel');