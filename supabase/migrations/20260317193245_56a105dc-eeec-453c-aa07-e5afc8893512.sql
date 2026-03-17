
ALTER TABLE public.visit_confirmation_settings
ADD COLUMN reply_confirmed_message text NOT NULL DEFAULT 'Ótimo, sua visita está *confirmada*! ✅

Estamos te esperando! Qualquer dúvida, é só chamar aqui. 😊',
ADD COLUMN reply_reschedule_message text NOT NULL DEFAULT 'Entendido! 📝

Nossa equipe vai entrar em contato para remarcar sua visita. Aguarde! 😊';
