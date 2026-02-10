-- Add next step reminder fields to wapi_bot_settings
ALTER TABLE public.wapi_bot_settings
ADD COLUMN IF NOT EXISTS next_step_reminder_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS next_step_reminder_delay_minutes integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS next_step_reminder_message text DEFAULT 'Oi {nome} estou por aqui escolha uma das opções.

*1* - Agendar visita
*2* - Tirar dúvidas
*3* - Analisar com calma';
