UPDATE public.company_landing_pages
SET offer = jsonb_build_object(
  'enabled', true,
  'title', 'Oferta Exclusiva por Tempo Limitado',
  'description', 'Reserve agora a data da sua festa e ganhe condições especiais que só temos esta semana!',
  'highlight_text', '🎁 Bônus exclusivo + Desconto especial para quem fechar este mês',
  'cta_text', 'QUERO GARANTIR MINHA OFERTA',
  'benefits_list', jsonb_build_array(
    'Espaço completo e climatizado',
    'Equipe de monitores profissionais',
    'Buffet completo para crianças e adultos',
    'Brinquedos e diversão garantida',
    'Bônus exclusivo desta semana 🎁'
  )
)
WHERE company_id = (SELECT id FROM public.companies WHERE slug = 'espaco-carrossel');