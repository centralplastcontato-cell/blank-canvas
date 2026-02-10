INSERT INTO public.company_landing_pages (company_id, is_published, hero, video, gallery, testimonials, offer, theme, footer)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  true,
  '{"title": "Castelo da Diversão", "subtitle": "O lugar perfeito para a festa dos sonhos do seu filho!", "cta_text": "Quero fazer minha festa!", "background_image_url": "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/a0000000-0000-0000-0000-000000000001/photos/1770664109270.jpg"}'::jsonb,
  '{"enabled": true, "title": "Conheça nosso espaço", "video_url": "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/a0000000-0000-0000-0000-000000000001/videos/1770664106179.mp4", "video_type": "upload"}'::jsonb,
  '{"enabled": true, "title": "Momentos Mágicos no Castelo", "photos": ["https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/a0000000-0000-0000-0000-000000000001/photos/1770664109270.jpg", "https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/a0000000-0000-0000-0000-000000000001/photos/1770664113909.jpg"]}'::jsonb,
  '{"enabled": true, "title": "O que nossos clientes dizem", "items": [{"name": "Fernanda Silva", "text": "A festa da minha filha foi simplesmente perfeita! Equipe atenciosa e espaço maravilhoso.", "rating": 5}, {"name": "Ricardo Oliveira", "text": "Melhor buffet da região! As crianças se divertiram muito e os adultos também.", "rating": 5}, {"name": "Camila Santos", "text": "Superou todas as expectativas. Recomendo de olhos fechados!", "rating": 5}]}'::jsonb,
  '{"enabled": true, "title": "Oferta Especial", "description": "Garanta sua data com condições imperdíveis!", "highlight_text": "Vagas limitadas!", "cta_text": "Aproveitar agora!"}'::jsonb,
  '{"primary_color": "#7c3aed", "secondary_color": "#f59e0b", "background_color": "#0f0d15", "text_color": "#ffffff", "font_heading": "Fredoka One", "font_body": "Nunito", "button_style": "pill"}'::jsonb,
  '{"show_address": true, "show_phone": true, "show_instagram": true, "custom_text": ""}'::jsonb
);