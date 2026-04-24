
UPDATE public.company_landing_pages
SET
  hero = jsonb_set(
    hero,
    '{subtitle}',
    '"Festas inesquecíveis no nosso espaço ou onde você quiser — levamos toda a estrutura até você!"'::jsonb
  ),
  benefits = jsonb_set(
    benefits,
    '{items}',
    '[
      {"icon":"Castle","title":"Estrutura Completa","description":"Espaço amplo e climatizado para receber você e seus convidados"},
      {"icon":"Truck","title":"Mobilidade Total","description":"Levamos toda a estrutura da festa até o local que você escolher"},
      {"icon":"Gamepad2","title":"Brinquedos Incríveis","description":"Diversão garantida para todas as idades"},
      {"icon":"UtensilsCrossed","title":"Buffet Completo","description":"Cardápio delicioso para crianças e adultos"},
      {"icon":"Users","title":"Monitores Profissionais","description":"Equipe treinada para cuidar da diversão e segurança"},
      {"icon":"Camera","title":"Espaço Instagramável","description":"Cenários decorados perfeitos para fotos memoráveis"},
      {"icon":"Award","title":"Atendimento Premium","description":"Cuidado e atenção em cada detalhe da sua festa"}
    ]'::jsonb
  ),
  how_it_works = '{
    "enabled": true,
    "title": "Dois Jeitos de Fazer Sua Festa",
    "steps": [
      {
        "icon": "Castle",
        "title": "🏠 No Nosso Espaço",
        "description": "Estrutura completa, climatizada e decorada. Brinquedos, buffet e monitores inclusos. Você só chega e curte com sua família!"
      },
      {
        "icon": "Truck",
        "title": "🚚 Festa Externa",
        "description": "Levamos toda a estrutura até você! Brinquedos, equipe e buffet no local que escolher: sua casa, condomínio, chácara — onde for!"
      }
    ]
  }'::jsonb,
  updated_at = now()
WHERE company_id = 'b81fca0b-6cd8-41c6-9cad-9590f1ed5f39';
