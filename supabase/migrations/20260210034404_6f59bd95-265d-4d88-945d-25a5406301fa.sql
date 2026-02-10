
-- Update Manchester bot_settings with full config
UPDATE wapi_bot_settings SET
  welcome_message = E'Olá! 👋 Bem-vindo ao Castelo da Diversão! \nPara podermos te ajudar melhor, preciso de algumas informações.',
  completion_message = E'Perfeito, {nome}! 🏰✨\n\nAnotei tudo aqui:\n\n📅 Mês: {mes}\n🗓️ Dia: {dia}\n👥 Convidados: {convidados}\n\n{nome}, agora eu irei te enviar algumas fotos e vídeo no nosso espaço !!',
  transfer_message = E'Entendido, {nome}! 🏰\n\nVou transferir sua conversa para nossa equipe comercial que vai te ajudar com sua festa.\n\nAguarde um momento, por favor! 👑',
  qualified_lead_message = E'Olá, {nome}! 👋\n\nRecebemos seu interesse pelo site e já temos seus dados aqui:\n\n📅 Mês: {mes}\n🗓️ Dia: {dia}\n👥 Convidados: {convidados}\n\n{nome}, agora eu irei te enviar algumas fotos e vídeo no nosso espaço !!',
  next_step_question = E'E agora, como você gostaria de continuar? 🤔\n\nResponda com o *número*:\n\n*1* - Agendar visita\n*2* - Tirar dúvidas\n*3* - Analisar com calma',
  next_step_visit_response = E'Ótima escolha! 🏰✨\n\nNossa equipe vai entrar em contato para agendar sua visita ao Castelo da Diversão!\n\nAguarde um momento que já vamos te chamar! 👑',
  next_step_questions_response = E'Claro! 💬\n\nPode mandar sua dúvida aqui que nossa equipe vai te responder rapidinho!\n\nEstamos à disposição! 👑',
  next_step_analyze_response = E'Sem problemas! 📋\n\nVou enviar nossos materiais para você analisar com calma. Quando estiver pronto, é só chamar aqui!\n\nEstamos à disposição! 👑✨',
  follow_up_enabled = true,
  follow_up_message = E'Olá, {nome}! 👋\n\nPassando para saber se teve a chance de analisar as informações que enviamos sobre o Castelo da Diversão! 🏰\n\nEstamos à disposição para esclarecer qualquer dúvida ou agendar uma visita para conhecer pessoalmente nossos espaços. \n\nPodemos te ajudar? 😊',
  follow_up_delay_hours = 24,
  follow_up_2_enabled = true,
  follow_up_2_message = E'Olá, {nome}! 👋\n\nAinda não tivemos retorno sobre a festa no Castelo da Diversão! 🏰\n\nTemos pacotes especiais e datas disponíveis para {mes}. Que tal agendar uma visita para conhecer nosso espaço? \n\nEstamos aqui para te ajudar! 😊',
  follow_up_2_delay_hours = 48,
  auto_send_materials = true,
  auto_send_pdf = true,
  auto_send_pdf_intro = E'📋 Oi {nome}! Segue o pacote completo para {convidados} na unidade {unidade}. 💜',
  auto_send_photos = true,
  auto_send_photos_intro = E'✨ Conheça nosso espaço incrível! 🏰🎉',
  auto_send_presentation_video = true,
  auto_send_promo_video = true,
  message_delay_seconds = 5
WHERE id = '512fc95d-7979-4991-a90e-b2d9e7d1ae42';

-- Update Trujillo bot_settings with full config
UPDATE wapi_bot_settings SET
  welcome_message = E'Olá! 👋 Bem-vindo ao Castelo da Diversão! Para podermos te ajudar melhor, preciso de algumas informações.',
  completion_message = E'Perfeito, {nome}! 🏰✨\n\nAnotei tudo aqui:\n\n📅 Mês: {mes}\n🗓️ Dia: {dia}\n👥 Convidados: {convidados}\n\n{nome}, agora eu irei te enviar algumas fotos e vídeo no nosso espaço !!',
  transfer_message = E'Entendido, {nome}! 🏰\n\nVou transferir sua conversa para nossa equipe comercial que vai te ajudar com sua festa.\n\nAguarde um momento, por favor! 👑',
  qualified_lead_message = E'Olá, {nome}! 👋\n\nRecebemos seu interesse pelo site e já temos seus dados aqui:\n\n📅 Mês: {mes}\n🗓️ Dia: {dia}\n👥 Convidados: {convidados}\n\n{nome}, agora eu irei te enviar algumas fotos e vídeo no nosso espaço !!',
  next_step_question = E'E agora, como você gostaria de continuar? 🤔\n\nResponda com o *número*:\n\n*1* - Agendar visita\n*2* - Tirar dúvidas\n*3* - Analisar com calma',
  next_step_visit_response = E'Ótima escolha! 🏰✨\n\nNossa equipe vai entrar em contato para agendar sua visita ao Castelo da Diversão!\n\nAguarde um momento que já vamos te chamar! 👑',
  next_step_questions_response = E'Claro! 💬\n\nPode mandar sua dúvida aqui que nossa equipe vai te responder rapidinho!\n\nEstamos à disposição! 👑',
  next_step_analyze_response = E'Sem problemas! 📋\n\nVou enviar nossos materiais para você analisar com calma. Quando estiver pronto, é só chamar aqui!\n\nEstamos à disposição! 👑✨',
  follow_up_enabled = true,
  follow_up_message = E'Olá, {nome}! 👋\n\nPassando para saber se teve a chance de analisar as informações que enviamos sobre o Castelo da Diversão! 🏰\n\nEstamos à disposição para esclarecer qualquer dúvida ou agendar uma visita para conhecer pessoalmente nossos espaços. \n\nPodemos te ajudar? 😊',
  follow_up_delay_hours = 24,
  follow_up_2_enabled = false,
  follow_up_2_message = E'Olá, {nome}! 👋\n\nAinda não tivemos retorno sobre a festa no Castelo da Diversão! 🏰\n\nTemos pacotes especiais e datas disponíveis para {mes}. Que tal agendar uma visita para conhecer nosso espaço? \n\nEstamos aqui para te ajudar! 😊',
  follow_up_2_delay_hours = 48,
  auto_send_materials = true,
  auto_send_pdf = true,
  auto_send_pdf_intro = E'📋 Oi {nome}! Segue o pacote completo para {convidados} na unidade {unidade}. 💜',
  auto_send_photos = true,
  auto_send_photos_intro = E'✨ Conheça nosso espaço incrível! 🏰🎉',
  auto_send_presentation_video = true,
  auto_send_promo_video = true,
  message_delay_seconds = 5
WHERE id = 'd01db8ca-6cca-4d53-b8eb-766317bf1143';

-- Insert bot questions for Manchester (instance 9b846163...)
INSERT INTO wapi_bot_questions (instance_id, company_id, step, question_text, confirmation_text, sort_order, is_active) VALUES
('9b846163-9580-436b-a33e-1e0eca106514', 'a0000000-0000-0000-0000-000000000001', 'tipo', E'Você já é nosso cliente e tem uma festa agendada, ou gostaria de receber um orçamento? 🎉\n\nResponda com o *número*:\n\n*1* - Já sou cliente\n*2* - Quero um orçamento', NULL, 1, true),
('9b846163-9580-436b-a33e-1e0eca106514', 'a0000000-0000-0000-0000-000000000001', 'nome', E'Para começar, me conta: qual é o seu nome? 👑', E'Muito prazer, {nome}! 👑✨', 1, true),
('9b846163-9580-436b-a33e-1e0eca106514', 'a0000000-0000-0000-0000-000000000001', 'mes', E'Que legal! 🎉 E pra qual mês você tá pensando em fazer essa festa incrível?\n\n📅 Responda com o *número*:\n\n*1* - Fevereiro\n*2* - Março\n*3* - Abril\n*4* - Maio\n*5* - Junho\n*6* - Julho\n*7* - Agosto\n*8* - Setembro\n*9* - Outubro\n*10* - Novembro\n*11* - Dezembro', E'{mes}, ótima escolha! 🎊', 3, true),
('9b846163-9580-436b-a33e-1e0eca106514', 'a0000000-0000-0000-0000-000000000001', 'dia', E'Maravilha! Tem preferência de dia da semana? 🗓️\n\nResponda com o *número*:\n\n*1* - Segunda a Quinta\n*2* - Sexta\n*3* - Sábado\n*4* - Domingo', E'Anotado!', 4, true),
('9b846163-9580-436b-a33e-1e0eca106514', 'a0000000-0000-0000-0000-000000000001', 'convidados', E'E quantos convidados você pretende chamar pra essa festa mágica? 🎈\n\n👥 Responda com o *número*:\n\n*1* - 50 pessoas\n*2* - 60 pessoas\n*3* - 70 pessoas\n*4* - 80 pessoas\n*5* - 90 pessoas\n*6* - 100 pessoas', NULL, 5, true);

-- Insert bot questions for Trujillo (instance 3f39419e...)
INSERT INTO wapi_bot_questions (instance_id, company_id, step, question_text, confirmation_text, sort_order, is_active) VALUES
('3f39419e-e7f5-4c3b-8ebd-1703e6c7a0c7', 'a0000000-0000-0000-0000-000000000001', 'tipo', E'Você já é nosso cliente e tem uma festa agendada, ou gostaria de receber um orçamento? 🎉\n\nResponda com o *número*:\n\n*1* - Já sou cliente\n*2* - Quero um orçamento', NULL, 1, true),
('3f39419e-e7f5-4c3b-8ebd-1703e6c7a0c7', 'a0000000-0000-0000-0000-000000000001', 'nome', E'Para começar, me conta: qual é o seu nome? 👑', E'Muito prazer, {nome}! 👑✨', 1, true),
('3f39419e-e7f5-4c3b-8ebd-1703e6c7a0c7', 'a0000000-0000-0000-0000-000000000001', 'mes', E'Que legal! 🎉 E pra qual mês você tá pensando em fazer essa festa incrível?\n\n📅 Responda com o *número*:\n\n*1* - Fevereiro\n*2* - Março\n*3* - Abril\n*4* - Maio\n*5* - Junho\n*6* - Julho\n*7* - Agosto\n*8* - Setembro\n*9* - Outubro\n*10* - Novembro\n*11* - Dezembro', E'{mes}, ótima escolha! 🎊', 3, true),
('3f39419e-e7f5-4c3b-8ebd-1703e6c7a0c7', 'a0000000-0000-0000-0000-000000000001', 'dia', E'Maravilha! Tem preferência de dia da semana? 🗓️\n\nResponda com o *número*:\n\n*1* - Segunda a Quinta\n*2* - Sexta\n*3* - Sábado\n*4* - Domingo', E'Anotado!', 4, true),
('3f39419e-e7f5-4c3b-8ebd-1703e6c7a0c7', 'a0000000-0000-0000-0000-000000000001', 'convidados', E'E quantos convidados você pretende chamar pra essa festa mágica? 🎈\n\n👥 Responda com o *número*:\n\n*1* - 50 pessoas\n*2* - 60 pessoas\n*3* - 70 pessoas\n*4* - 80 pessoas\n*5* - 90 pessoas\n*6* - 100 pessoas', NULL, 5, true);
