-- Apresentação da Bia: nome da assistente e a arte dela, que vai na 1ª mensagem
-- (boas-vindas do site e primeira resposta no WhatsApp), com a apresentação na legenda.
ALTER TABLE public.ai_agent_settings
  ADD COLUMN IF NOT EXISTS assistant_name text,
  ADD COLUMN IF NOT EXISTS intro_image_url text;
