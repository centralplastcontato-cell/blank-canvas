
-- =============================================
-- 1. Create lp_bot_settings table
-- =============================================
CREATE TABLE public.lp_bot_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  welcome_message TEXT DEFAULT 'Oi 👋 Que bom te ver por aqui!\n\nVou te fazer algumas perguntas rápidas para montar seu orçamento 😉',
  month_question TEXT DEFAULT 'Para qual mês você pretende realizar a festa?',
  guest_question TEXT DEFAULT 'Para quantas pessoas será a festa?',
  name_question TEXT DEFAULT 'Digite seu nome:',
  whatsapp_question TEXT DEFAULT 'Digite seu WhatsApp:',
  completion_message TEXT DEFAULT 'Prontinho 🎉\n\nRecebemos suas informações e nossa equipe vai entrar em contato em breve para confirmar valores e disponibilidade da sua data.\n\nAcabei de te enviar uma mensagem no seu WhatsApp, dá uma olhadinha lá! 📲',
  month_options JSONB DEFAULT '["Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"]'::jsonb,
  guest_options JSONB DEFAULT '["Até 50 pessoas","51 a 70 pessoas","71 a 100 pessoas","101 a 150 pessoas","Mais de 150 pessoas"]'::jsonb,
  guest_limit INTEGER DEFAULT NULL,
  guest_limit_message TEXT DEFAULT NULL,
  guest_limit_redirect_name TEXT DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT lp_bot_settings_company_id_unique UNIQUE (company_id)
);

-- Enable RLS
ALTER TABLE public.lp_bot_settings ENABLE ROW LEVEL SECURITY;

-- Public can READ (needed for LP chatbot to load settings without auth)
CREATE POLICY "Anyone can view lp_bot_settings"
ON public.lp_bot_settings FOR SELECT
USING (true);

-- Company admins/owners can manage their own settings
CREATE POLICY "Company admins can manage lp_bot_settings"
ON public.lp_bot_settings FOR ALL
USING (
  is_admin(auth.uid()) OR (
    company_id = ANY(get_user_company_ids(auth.uid()))
    AND EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = lp_bot_settings.company_id
        AND uc.role = ANY(ARRAY['owner','admin'])
    )
  )
)
WITH CHECK (
  is_admin(auth.uid()) OR (
    company_id = ANY(get_user_company_ids(auth.uid()))
    AND EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = lp_bot_settings.company_id
        AND uc.role = ANY(ARRAY['owner','admin'])
    )
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_lp_bot_settings_updated_at
BEFORE UPDATE ON public.lp_bot_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 2. Add guest_limit columns to wapi_bot_settings
-- =============================================
ALTER TABLE public.wapi_bot_settings
  ADD COLUMN IF NOT EXISTS guest_limit INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS guest_limit_message TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS guest_limit_redirect_name TEXT DEFAULT NULL;
