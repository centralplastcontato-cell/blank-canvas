CREATE TABLE public.campaign_response_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  main_message TEXT NOT NULL DEFAULT 'Olá {{nome}}! 😊 Que bom ter sua atenção! Como podemos te ajudar agora? Escolha uma das opções abaixo:',
  option_1_label TEXT NOT NULL DEFAULT 'Agendar uma visita',
  option_2_label TEXT NOT NULL DEFAULT 'Falar com atendente',
  option_3_label TEXT NOT NULL DEFAULT 'Analisar com calma',
  option_1_action TEXT NOT NULL DEFAULT 'create_visit',
  option_2_action TEXT NOT NULL DEFAULT 'pause_bot_notify',
  option_3_action TEXT NOT NULL DEFAULT 'schedule_followup',
  followup_days INTEGER NOT NULL DEFAULT 7,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_response_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company campaign response settings"
ON public.campaign_response_settings
FOR SELECT
USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can insert their company campaign response settings"
ON public.campaign_response_settings
FOR INSERT
WITH CHECK (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can update their company campaign response settings"
ON public.campaign_response_settings
FOR UPDATE
USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can delete their company campaign response settings"
ON public.campaign_response_settings
FOR DELETE
USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE TRIGGER update_campaign_response_settings_updated_at
BEFORE UPDATE ON public.campaign_response_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();