-- Add next step question and response messages to bot settings
ALTER TABLE public.wapi_bot_settings 
ADD COLUMN IF NOT EXISTS next_step_question text DEFAULT 'E agora, como você gostaria de continuar? 🤔

Responda com o *número*:

*1* - Agendar visita
*2* - Tirar dúvidas
*3* - Analisar com calma',
ADD COLUMN IF NOT EXISTS next_step_visit_response text DEFAULT 'Ótima escolha! 🏰✨

Nossa equipe vai entrar em contato para agendar sua visita ao Castelo da Diversão!

Aguarde um momento que já vamos te chamar! 👑',
ADD COLUMN IF NOT EXISTS next_step_questions_response text DEFAULT 'Claro! 💬

Pode mandar sua dúvida aqui que nossa equipe vai te responder rapidinho!

Estamos à disposição! 👑',
ADD COLUMN IF NOT EXISTS next_step_analyze_response text DEFAULT 'Sem problemas! 📋

Vou enviar nossos materiais para você analisar com calma. Quando estiver pronto, é só chamar aqui!

Estamos à disposição! 👑✨';