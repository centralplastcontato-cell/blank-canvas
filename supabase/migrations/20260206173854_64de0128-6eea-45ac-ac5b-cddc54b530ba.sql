-- Add follow-up configuration to wapi_bot_settings
ALTER TABLE public.wapi_bot_settings
ADD COLUMN IF NOT EXISTS follow_up_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS follow_up_delay_hours integer DEFAULT 24,
ADD COLUMN IF NOT EXISTS follow_up_message text DEFAULT 'Olá, {nome}! 👋

Passando para saber se teve a chance de analisar as informações que enviamos sobre o Castelo da Diversão! 🏰

Estamos à disposição para esclarecer qualquer dúvida ou agendar uma visita para conhecer pessoalmente nossos espaços. 

Podemos te ajudar? 😊';