-- Add second follow-up configuration fields
ALTER TABLE public.wapi_bot_settings
ADD COLUMN IF NOT EXISTS follow_up_2_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS follow_up_2_delay_hours integer DEFAULT 48,
ADD COLUMN IF NOT EXISTS follow_up_2_message text DEFAULT 'Olá, {nome}! 👋

Ainda não tivemos retorno sobre a festa no Castelo da Diversão! 🏰

Temos pacotes especiais e datas disponíveis para {mes}. Que tal agendar uma visita para conhecer nosso espaço? 

Estamos aqui para te ajudar! 😊';