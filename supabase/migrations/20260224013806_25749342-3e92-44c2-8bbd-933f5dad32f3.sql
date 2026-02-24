INSERT INTO lp_bot_settings (
  company_id, welcome_message, month_question, guest_question,
  name_question, whatsapp_question, completion_message,
  month_options, guest_options,
  guest_limit, guest_limit_message, guest_limit_redirect_name
)
SELECT
  id,
  E'Oi 👋 Que bom te ver por aqui!\n\nVou te fazer algumas perguntas rápidas para montar seu orçamento 😉',
  'Para qual mês você pretende realizar a festa?',
  'Para quantas pessoas será a festa?',
  'Digite seu nome:',
  'Digite seu WhatsApp:',
  E'Prontinho 🎉\n\nRecebemos suas informações e nossa equipe vai entrar em contato em breve para confirmar valores e disponibilidade da sua data.\n\nAcabei de te enviar uma mensagem no seu WhatsApp, dá uma olhadinha lá! 📲',
  '["Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"]'::jsonb,
  '["Até 50 pessoas","51 a 70 pessoas","71 a 90 pessoas","Acima de 90 pessoas"]'::jsonb,
  90,
  E'Nossa capacidade máxima é de 90 convidados 😊\n\nPara melhor lhe atender, podemos direcionar seu contato para o Buffet Mega Magic, próximo de nós, para envio de orçamento sem compromisso.\n\nDeseja que a gente encaminhe?',
  'Buffet Mega Magic'
FROM companies
WHERE slug = 'planeta-divertido'
ON CONFLICT (company_id) DO NOTHING;