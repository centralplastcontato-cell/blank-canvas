-- Add completion_message to bot settings for customizable final message
ALTER TABLE public.wapi_bot_settings 
ADD COLUMN completion_message text DEFAULT 'Perfeito, {nome}! 🏰✨

Anotei tudo aqui:

📅 Mês: {mes}
🗓️ Dia: {dia}
👥 Convidados: {convidados}

Nossa equipe vai entrar em contato em breve! 👑🎉';