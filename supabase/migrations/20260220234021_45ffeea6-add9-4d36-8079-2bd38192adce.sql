
-- Populate Planeta Divertido benefits
UPDATE public.company_landing_pages SET benefits = '{
  "enabled": true,
  "title": "Por que escolher o Planeta Divertido?",
  "subtitle": "Um espaço familiar pensado para tornar cada festa única e especial",
  "items": [
    {"icon": "Home", "title": "Espaço Aconchegante", "description": "Ambiente familiar para até 90 convidados, pensado para festas íntimas e especiais"},
    {"icon": "Heart", "title": "Atendimento Personalizado", "description": "Fernanda cuida de cada detalhe da sua festa pessoalmente"},
    {"icon": "UtensilsCrossed", "title": "Buffet Caseiro", "description": "Cardápio feito com carinho, com opções para crianças e adultos"},
    {"icon": "Users", "title": "Monitores Dedicados", "description": "Profissionais preparados para garantir a diversão das crianças"},
    {"icon": "MapPin", "title": "Localização Privilegiada", "description": "Na Avenida Mazzei, 692 — fácil acesso na Zona Norte de SP"},
    {"icon": "Settings", "title": "Flexibilidade", "description": "Pacotes adaptáveis ao que você precisa, sem surpresas"}
  ],
  "trust_badges": [
    {"icon": "Star", "text": "Atendimento Nota 10"},
    {"icon": "PartyPopper", "text": "Festas Personalizadas"},
    {"icon": "Heart", "text": "100% Familiar"}
  ]
}'::jsonb,
offer = jsonb_set(offer, '{benefits_list}', '["Espaço exclusivo e climatizado", "Buffet completo caseiro", "Equipe de monitores", "Decoração temática", "Estacionamento no local"]'::jsonb)
WHERE company_id = '6bc204ae-1311-4c67-bb6b-9ab55dae9d11';

-- Populate Castelo da Diversão with its current content (so it's explicit)
UPDATE public.company_landing_pages SET benefits = '{
  "enabled": true,
  "title": "",
  "subtitle": "Há mais de 10 anos transformando sonhos em realidade com festas inesquecíveis",
  "items": [
    {"icon": "Castle", "title": "Estrutura Completa", "description": "Espaço amplo e climatizado com capacidade para até 150 convidados"},
    {"icon": "Gamepad2", "title": "Brinquedos Incríveis", "description": "Pula-pula, piscina de bolinhas, playground e muito mais diversão"},
    {"icon": "UtensilsCrossed", "title": "Buffet Completo", "description": "Cardápio delicioso para crianças e adultos com opções variadas"},
    {"icon": "Users", "title": "Monitores Profissionais", "description": "Equipe treinada para cuidar da diversão e segurança das crianças"},
    {"icon": "Camera", "title": "Espaço Instagramável", "description": "Cenários decorados perfeitos para fotos memoráveis"},
    {"icon": "Award", "title": "+10 Anos na Cidade", "description": "Milhares de festas realizadas com excelência e alegria"}
  ],
  "trust_badges": [
    {"icon": "Star", "text": "4.9/5 no Google"},
    {"icon": "PartyPopper", "text": "+5.000 festas realizadas"},
    {"icon": "Heart", "text": "98% de satisfação"}
  ]
}'::jsonb
WHERE company_id = 'a0000000-0000-0000-0000-000000000001';
