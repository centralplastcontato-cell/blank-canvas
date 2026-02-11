-- Add bot inactive follow-up settings
ALTER TABLE public.wapi_bot_settings
  ADD COLUMN IF NOT EXISTS bot_inactive_followup_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS bot_inactive_followup_delay_minutes integer DEFAULT 30,
  ADD COLUMN IF NOT EXISTS bot_inactive_followup_message text DEFAULT 'Oi {nome}, notei que você não conseguiu concluir. Estou por aqui caso precise de ajuda! 😊

Podemos continuar de onde paramos?';