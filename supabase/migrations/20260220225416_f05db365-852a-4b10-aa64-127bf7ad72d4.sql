-- Corrigir domain_canonical e custom_domain do Planeta Divertido para .online
UPDATE companies
SET
  custom_domain = 'buffetplanetadivertido.online',
  domain_canonical = 'buffetplanetadivertido.online',
  updated_at = now()
WHERE id = '6bc204ae-1311-4c67-bb6b-9ab55dae9d11';

-- Criar landing page inicial para o Planeta Divertido (não publicada)
INSERT INTO company_landing_pages (
  company_id,
  hero,
  video,
  gallery,
  testimonials,
  offer,
  theme,
  footer,
  is_published
)
VALUES (
  '6bc204ae-1311-4c67-bb6b-9ab55dae9d11',
  '{
    "title": "O Buffet Infantil que vai fazer a festa do seu filho inesquecível!",
    "subtitle": "Venha conhecer o Planeta Divertido e agende uma visita sem compromisso.",
    "cta_text": "Quero saber mais",
    "background_image_url": null,
    "background_images": []
  }'::jsonb,
  '{
    "enabled": false,
    "title": "Conheça nossa estrutura",
    "video_url": null,
    "video_type": "youtube",
    "videos": []
  }'::jsonb,
  '{
    "enabled": false,
    "title": "Nossa estrutura",
    "photos": [],
    "units": []
  }'::jsonb,
  '{
    "enabled": false,
    "title": "O que os pais dizem",
    "items": []
  }'::jsonb,
  '{
    "enabled": false,
    "title": "Oferta especial",
    "description": "",
    "highlight_text": "",
    "cta_text": "Aproveitar"
  }'::jsonb,
  '{
    "primary_color": "#8B5CF6",
    "secondary_color": "#F59E0B",
    "background_color": "#FFFFFF",
    "text_color": "#1F2937",
    "font_heading": "Poppins",
    "font_body": "Inter",
    "button_style": "rounded"
  }'::jsonb,
  '{
    "show_address": true,
    "show_phone": true,
    "show_instagram": true,
    "custom_text": ""
  }'::jsonb,
  false
)
ON CONFLICT (company_id) DO NOTHING;