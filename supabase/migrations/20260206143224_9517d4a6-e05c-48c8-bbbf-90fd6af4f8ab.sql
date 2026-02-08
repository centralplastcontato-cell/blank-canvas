-- Add auto-send materials configuration to bot settings
ALTER TABLE public.wapi_bot_settings
ADD COLUMN IF NOT EXISTS auto_send_materials boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS auto_send_photos boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS auto_send_presentation_video boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS auto_send_promo_video boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS auto_send_pdf boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS auto_send_photos_intro text DEFAULT '✨ Conheça nosso espaço incrível! 🏰🎉',
ADD COLUMN IF NOT EXISTS auto_send_pdf_intro text DEFAULT '📋 Oi {nome}! Segue o pacote completo para {convidados} na unidade {unidade}. Qualquer dúvida é só chamar! 💜';

COMMENT ON COLUMN public.wapi_bot_settings.auto_send_materials IS 'Enable/disable automatic material sending after qualification';
COMMENT ON COLUMN public.wapi_bot_settings.auto_send_photos IS 'Send photo collection after qualification';
COMMENT ON COLUMN public.wapi_bot_settings.auto_send_presentation_video IS 'Send presentation video after qualification';
COMMENT ON COLUMN public.wapi_bot_settings.auto_send_promo_video IS 'Send promo video for Feb/March leads';
COMMENT ON COLUMN public.wapi_bot_settings.auto_send_pdf IS 'Send PDF package matching guest count';
COMMENT ON COLUMN public.wapi_bot_settings.auto_send_photos_intro IS 'Intro message before sending photos';
COMMENT ON COLUMN public.wapi_bot_settings.auto_send_pdf_intro IS 'Intro message before sending PDF';