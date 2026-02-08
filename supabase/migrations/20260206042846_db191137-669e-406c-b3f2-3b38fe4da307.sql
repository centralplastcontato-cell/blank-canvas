-- Add qualified_lead_message column to wapi_bot_settings
-- This message is sent when a lead from LP (already qualified) sends a message
ALTER TABLE public.wapi_bot_settings 
ADD COLUMN IF NOT EXISTS qualified_lead_message text DEFAULT 'Olá, {nome}! 👋

Recebemos seu interesse pelo site e já temos seus dados aqui:

📅 Mês: {mes}
🗓️ Dia: {dia}
👥 Convidados: {convidados}

Nossa equipe vai te responder em breve! 🏰✨';