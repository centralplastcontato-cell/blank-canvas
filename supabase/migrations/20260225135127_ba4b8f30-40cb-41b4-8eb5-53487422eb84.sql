
-- Set domain_canonical for Aventura Kids
UPDATE companies SET domain_canonical = 'aventurakids.online' WHERE id = 'eb1776f0-142e-41db-9134-7d352d02c5bd';

-- Insert landing page data
INSERT INTO company_landing_pages (
  company_id, is_published,
  hero, social_proof, benefits, gallery, video, how_it_works, testimonials, offer, theme, footer
) VALUES (
  'eb1776f0-142e-41db-9134-7d352d02c5bd',
  true,
  '{"title":"Transformamos cada celebração em uma aventura inesquecível","subtitle":"Buffet infantil completo em São Gotardo/MG. Estrutura, organização e diversão para toda a família.","cta_text":"Solicitar Orçamento Agora","secondary_cta_text":"Falar no WhatsApp","secondary_cta_url":"https://wa.me/5534997310669?text=Ol%C3%A1!%20Gostaria%20de%20saber%20mais%20sobre%20os%20pacotes%20de%20festa%20infantil.","background_image_url":"https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/eb1776f0-142e-41db-9134-7d352d02c5bd/photos/1772025495578-pi3s4wk6a2l.png","background_images":["https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/eb1776f0-142e-41db-9134-7d352d02c5bd/photos/1772025495578-pi3s4wk6a2l.png","https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/eb1776f0-142e-41db-9134-7d352d02c5bd/photos/1772025510811-5ncyfjkgo5b.jpeg"]}'::jsonb,
  '{"enabled":true,"items":[{"value":"+300","label":"festas realizadas"},{"value":"+2.500","label":"famílias atendidas"},{"value":"100%","label":"dedicação em cada detalhe"}],"text":"Somos referência em festas infantis em São Gotardo e região."}'::jsonb,
  '{"enabled":true,"title":"Por que escolher a Aventura Kids?","subtitle":"Tudo o que você precisa para uma festa perfeita","items":[{"icon":"MessageCircle","title":"Atendimento rápido e personalizado","description":"Respondemos suas dúvidas com agilidade e atenção."},{"icon":"Shield","title":"Espaço seguro e estruturado","description":"Ambiente preparado para a segurança e diversão das crianças."},{"icon":"Users","title":"Equipe preparada","description":"Profissionais treinados para cuidar de cada momento."},{"icon":"ClipboardCheck","title":"Organização profissional","description":"Planejamento completo para você curtir sem preocupações."},{"icon":"Settings","title":"Pacotes personalizáveis","description":"Monte o pacote ideal para o seu evento."},{"icon":"UtensilsCrossed","title":"Cardápio completo","description":"Salgados, doces e opções variadas com qualidade."}],"trust_badges":[]}'::jsonb,
  '{"enabled":true,"title":"Um espaço pensado para encantar","photos":["https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/eb1776f0-142e-41db-9134-7d352d02c5bd/photos/1772025511339-jfcvhmldhs.png","https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/eb1776f0-142e-41db-9134-7d352d02c5bd/photos/1772025512776-1kmq7jcfdx8.png","https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/eb1776f0-142e-41db-9134-7d352d02c5bd/photos/1772025513580-lf4lmvkxg3f.png","https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/eb1776f0-142e-41db-9134-7d352d02c5bd/photos/1772025514702-yey9ww9gi6b.jpeg","https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/eb1776f0-142e-41db-9134-7d352d02c5bd/photos/1772025566714-ogkoktakuh.jpeg","https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/eb1776f0-142e-41db-9134-7d352d02c5bd/photos/1772025567495-7bd11nz5dmr.jpeg","https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/eb1776f0-142e-41db-9134-7d352d02c5bd/photos/1772025567817-ixf77g2787.jpeg","https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/eb1776f0-142e-41db-9134-7d352d02c5bd/photos/1772025568618-q2n62g4g2c.jpeg"]}'::jsonb,
  '{"enabled":true,"title":"Conheça a Aventura Kids","video_url":"https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/eb1776f0-142e-41db-9134-7d352d02c5bd/videos/1772025705892-gsmvwqi3ed4.mp4","video_type":"upload"}'::jsonb,
  '{"enabled":true,"title":"Planejar sua festa é simples","steps":[{"title":"Escolha a data","description":"Selecione o melhor dia para sua celebração.","icon":"CalendarDays"},{"title":"Defina o pacote ideal","description":"Escolha entre nossas opções personalizáveis.","icon":"Package"},{"title":"Personalize o tema","description":"Deixe a festa com a cara do seu filho.","icon":"Palette"},{"title":"Aproveite a festa","description":"Curta sem preocupações, cuidamos de tudo.","icon":"PartyPopper"}]}'::jsonb,
  '{"enabled":false,"title":"O que nossos clientes dizem","items":[]}'::jsonb,
  '{"enabled":true,"title":"Garanta sua data antes que ela seja reservada","description":"Fale agora com nossa equipe e receba seu orçamento personalizado.","highlight_text":"Datas limitadas!","cta_text":"Quero meu orçamento agora","benefits_list":["Orçamento sem compromisso","Resposta em até 24h","Pacotes sob consulta"]}'::jsonb,
  '{"primary_color":"#4A90D9","secondary_color":"#25D366","background_color":"#FFFFFF","text_color":"#1a1a2e","font_heading":"Fredoka, sans-serif","font_body":"Nunito, sans-serif","button_style":"pill"}'::jsonb,
  '{"show_address":true,"show_phone":true,"show_instagram":true,"custom_text":"Aventura Kids – Festas e Eventos | São Gotardo/MG"}'::jsonb
)
ON CONFLICT (company_id) DO UPDATE SET
  is_published = true,
  hero = EXCLUDED.hero,
  social_proof = EXCLUDED.social_proof,
  benefits = EXCLUDED.benefits,
  gallery = EXCLUDED.gallery,
  video = EXCLUDED.video,
  how_it_works = EXCLUDED.how_it_works,
  testimonials = EXCLUDED.testimonials,
  offer = EXCLUDED.offer,
  theme = EXCLUDED.theme,
  footer = EXCLUDED.footer,
  updated_at = now();

-- Insert lp_bot_settings (month_options and guest_options are jsonb)
INSERT INTO lp_bot_settings (company_id, welcome_message, month_question, guest_question, name_question, whatsapp_question, completion_message, month_options, guest_options)
VALUES (
  'eb1776f0-142e-41db-9134-7d352d02c5bd',
  '🎉 Olá! Bem-vindo à Aventura Kids! Vamos montar a festa perfeita para você?',
  '📅 Para qual mês você está planejando a festa?',
  '👥 Quantos convidados você espera?',
  '😊 Qual o seu nome?',
  '📱 Qual seu WhatsApp para enviarmos o orçamento?',
  '✅ Perfeito! Nossa equipe da Aventura Kids vai entrar em contato pelo WhatsApp para montar seu orçamento personalizado. Até breve! 🎈',
  '["Março/2025","Abril/2025","Maio/2025","Junho/2025","Julho/2025","Agosto/2025","Setembro/2025","Outubro/2025","Novembro/2025","Dezembro/2025","Janeiro/2026","Fevereiro/2026","Março/2026","Ainda não decidi"]'::jsonb,
  '["Até 30","31 a 50","51 a 80","81 a 100","101 a 150","Mais de 150"]'::jsonb
)
ON CONFLICT (company_id) DO UPDATE SET
  welcome_message = EXCLUDED.welcome_message,
  month_question = EXCLUDED.month_question,
  guest_question = EXCLUDED.guest_question,
  name_question = EXCLUDED.name_question,
  whatsapp_question = EXCLUDED.whatsapp_question,
  completion_message = EXCLUDED.completion_message,
  month_options = EXCLUDED.month_options,
  guest_options = EXCLUDED.guest_options,
  updated_at = now();
