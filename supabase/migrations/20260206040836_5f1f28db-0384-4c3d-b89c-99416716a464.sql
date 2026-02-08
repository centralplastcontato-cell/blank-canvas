-- Add transfer_message column to wapi_bot_settings
ALTER TABLE public.wapi_bot_settings
ADD COLUMN transfer_message text DEFAULT 'Entendido, {nome}! 🏰

Vou transferir sua conversa para nossa equipe comercial que vai te ajudar com sua festa.

Aguarde um momento, por favor! 👑';