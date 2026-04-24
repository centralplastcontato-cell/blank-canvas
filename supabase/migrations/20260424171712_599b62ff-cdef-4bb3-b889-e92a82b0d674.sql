INSERT INTO public.company_landing_pages (
  company_id,
  is_published,
  hero,
  video,
  gallery,
  testimonials,
  offer,
  benefits,
  theme,
  footer,
  social_proof,
  how_it_works
) VALUES (
  'b81fca0b-6cd8-41c6-9cad-9590f1ed5f39',
  true,
  '{"title":"Espaço Carrossel","subtitle":"O lugar perfeito para a festa dos sonhos do seu filho!","cta_text":"Quero fazer minha festa!","background_image_url":"","background_images":[]}'::jsonb,
  '{"enabled":false,"url":"","title":""}'::jsonb,
  '{"enabled":true,"title":"Momentos Mágicos no Espaço Carrossel","photos":[],"units":[]}'::jsonb,
  '{"enabled":true,"items":[
    {"name":"Fernanda Silva","rating":5,"text":"A festa da minha filha foi simplesmente perfeita! Equipe atenciosa e espaço maravilhoso."},
    {"name":"Ricardo Oliveira","rating":5,"text":"Melhor buffet da região! As crianças se divertiram muito e os adultos também."},
    {"name":"Camila Santos","rating":5,"text":"Superou todas as expectativas. Recomendo de olhos fechados!"}
  ]}'::jsonb,
  '{"enabled":true,"title":"Oferta Especial","description":"Garanta sua data com condições imperdíveis!","highlight_text":"Vagas limitadas!","cta_text":"Aproveitar agora!"}'::jsonb,
  '{"enabled":true,"title":"","subtitle":"Transformando sonhos em festas inesquecíveis","items":[
    {"icon":"Castle","title":"Estrutura Completa","description":"Espaço amplo e climatizado para receber você e seus convidados"},
    {"icon":"Gamepad2","title":"Brinquedos Incríveis","description":"Diversão garantida para todas as idades"},
    {"icon":"UtensilsCrossed","title":"Buffet Completo","description":"Cardápio delicioso para crianças e adultos"},
    {"icon":"Users","title":"Monitores Profissionais","description":"Equipe treinada para cuidar da diversão e segurança"},
    {"icon":"Camera","title":"Espaço Instagramável","description":"Cenários decorados perfeitos para fotos memoráveis"},
    {"icon":"Award","title":"Atendimento Premium","description":"Cuidado e atenção em cada detalhe da sua festa"}
  ],"trust_badges":[
    {"icon":"Star","text":"Avaliação 5 estrelas"},
    {"icon":"PartyPopper","text":"Festas inesquecíveis"},
    {"icon":"Heart","text":"Clientes satisfeitos"}
  ]}'::jsonb,
  '{"primary_color":"#7c3aed","secondary_color":"#ec4899"}'::jsonb,
  '{"show_address":true,"show_phone":true,"show_instagram":true,"custom_text":""}'::jsonb,
  '{"enabled":false,"text":"","items":[]}'::jsonb,
  '{"enabled":false,"title":"","steps":[]}'::jsonb
);