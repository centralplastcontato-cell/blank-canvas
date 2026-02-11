
-- Atualizar constraint para incluir delay e timer
ALTER TABLE flow_nodes DROP CONSTRAINT flow_nodes_node_type_check;
ALTER TABLE flow_nodes ADD CONSTRAINT flow_nodes_node_type_check 
  CHECK (node_type = ANY (ARRAY['start','message','question','action','condition','end','delay','timer']));

-- Criar fluxo completo do bot (DESATIVADO)
DO $$
DECLARE
  v_flow_id uuid := gen_random_uuid();
  v_company_id uuid := 'a0000000-0000-0000-0000-000000000001';
  v_start uuid := gen_random_uuid();
  v_tipo uuid := gen_random_uuid();
  v_mark_cliente uuid := gen_random_uuid();
  v_transfer_cliente uuid := gen_random_uuid();
  v_handoff_cliente uuid := gen_random_uuid();
  v_end_cliente uuid := gen_random_uuid();
  v_trabalhe_msg uuid := gen_random_uuid();
  v_handoff_trabalhe uuid := gen_random_uuid();
  v_end_trabalhe uuid := gen_random_uuid();
  v_nome uuid := gen_random_uuid();
  v_prazer uuid := gen_random_uuid();
  v_mes uuid := gen_random_uuid();
  v_dia uuid := gen_random_uuid();
  v_convidados uuid := gen_random_uuid();
  v_completion uuid := gen_random_uuid();
  v_send_photos uuid := gen_random_uuid();
  v_delay1 uuid := gen_random_uuid();
  v_send_pdf uuid := gen_random_uuid();
  v_delay2 uuid := gen_random_uuid();
  v_send_video uuid := gen_random_uuid();
  v_proximo uuid := gen_random_uuid();
  v_visita_msg uuid := gen_random_uuid();
  v_schedule_visit uuid := gen_random_uuid();
  v_end_visita uuid := gen_random_uuid();
  v_duvidas_msg uuid := gen_random_uuid();
  v_handoff_duvidas uuid := gen_random_uuid();
  v_end_duvidas uuid := gen_random_uuid();
  v_calma_msg uuid := gen_random_uuid();
  v_disable_followup uuid := gen_random_uuid();
  v_end_calma uuid := gen_random_uuid();
  v_opt_cliente uuid := gen_random_uuid();
  v_opt_orcamento uuid := gen_random_uuid();
  v_opt_trabalhe uuid := gen_random_uuid();
  v_opt_mes2 uuid := gen_random_uuid();
  v_opt_mes3 uuid := gen_random_uuid();
  v_opt_mes4 uuid := gen_random_uuid();
  v_opt_mes5 uuid := gen_random_uuid();
  v_opt_mes6 uuid := gen_random_uuid();
  v_opt_mes7 uuid := gen_random_uuid();
  v_opt_mes8 uuid := gen_random_uuid();
  v_opt_mes9 uuid := gen_random_uuid();
  v_opt_mes10 uuid := gen_random_uuid();
  v_opt_mes11 uuid := gen_random_uuid();
  v_opt_mes12 uuid := gen_random_uuid();
  v_opt_dia1 uuid := gen_random_uuid();
  v_opt_dia2 uuid := gen_random_uuid();
  v_opt_dia3 uuid := gen_random_uuid();
  v_opt_dia4 uuid := gen_random_uuid();
  v_opt_conv1 uuid := gen_random_uuid();
  v_opt_conv2 uuid := gen_random_uuid();
  v_opt_conv3 uuid := gen_random_uuid();
  v_opt_conv4 uuid := gen_random_uuid();
  v_opt_conv5 uuid := gen_random_uuid();
  v_opt_conv6 uuid := gen_random_uuid();
  v_opt_prox1 uuid := gen_random_uuid();
  v_opt_prox2 uuid := gen_random_uuid();
  v_opt_prox3 uuid := gen_random_uuid();
BEGIN
  INSERT INTO conversation_flows (id, company_id, name, description, is_active, is_default)
  VALUES (v_flow_id, v_company_id, 'Fluxo Completo Bot', 'Réplica completa do fluxo fixo do bot com todas as etapas de qualificação, envio de materiais e próximo passo.', false, false);

  INSERT INTO flow_nodes (id, flow_id, node_type, title, message_template, action_type, action_config, extract_field, position_x, position_y, display_order, allow_ai_interpretation, require_extraction) VALUES
  (v_start, v_flow_id, 'start', 'Início', E'Olá! 👋 Bem-vindo ao Castelo da Diversão!\nPara podermos te ajudar melhor, preciso de algumas informações.', NULL, NULL, NULL, 400, 50, 0, false, false),
  (v_tipo, v_flow_id, 'question', 'Tipo de Atendimento', E'Você já é nosso cliente e tem uma festa agendada, ou gostaria de receber um orçamento? 🎉\n\nResponda com o *número*:', NULL, NULL, NULL, 400, 230, 1, false, false),
  (v_mark_cliente, v_flow_id, 'action', 'Marcar como Cliente', NULL, 'mark_existing_customer', NULL, NULL, 80, 430, 2, false, false),
  (v_transfer_cliente, v_flow_id, 'message', 'Transferência Cliente', E'Entendido! 🏰\n\nVou transferir sua conversa para nossa equipe que vai te ajudar com sua festa.\n\nAguarde um momento, por favor! 👑', NULL, NULL, NULL, 80, 610, 3, false, false),
  (v_handoff_cliente, v_flow_id, 'action', 'Transbordo Cliente', NULL, 'handoff', NULL, NULL, 80, 790, 4, false, false),
  (v_end_cliente, v_flow_id, 'end', 'Fim Cliente', NULL, NULL, NULL, NULL, 80, 950, 5, false, false),
  (v_trabalhe_msg, v_flow_id, 'message', 'Trabalhe Conosco', E'Que legal que você quer fazer parte do nosso time! 🏰✨\n\nVou transferir sua conversa para nossa equipe de RH.\n\nAguarde um momento! 👑', NULL, NULL, NULL, 720, 430, 6, false, false),
  (v_handoff_trabalhe, v_flow_id, 'action', 'Transbordo Trabalhe', NULL, 'handoff', NULL, NULL, 720, 610, 7, false, false),
  (v_end_trabalhe, v_flow_id, 'end', 'Fim Trabalhe', NULL, NULL, NULL, NULL, 720, 790, 8, false, false),
  (v_nome, v_flow_id, 'question', 'Pergunta Nome', 'Para começar, me conta: qual é o seu nome? 👑', NULL, NULL, 'customer_name', 400, 430, 9, true, true),
  (v_prazer, v_flow_id, 'message', 'Confirmação Nome', 'Muito prazer, {customer_name}! 👑✨', NULL, NULL, NULL, 400, 610, 10, false, false),
  (v_mes, v_flow_id, 'question', 'Mês da Festa', E'Que legal! 🎉 E pra qual mês você tá pensando em fazer essa festa incrível?\n\n📅 Responda com o *número*:', NULL, NULL, 'event_date', 400, 790, 11, true, false),
  (v_dia, v_flow_id, 'question', 'Dia da Semana', E'Maravilha! Tem preferência de dia da semana? 🗓️\n\nResponda com o *número*:', NULL, NULL, NULL, 400, 970, 12, true, false),
  (v_convidados, v_flow_id, 'question', 'Convidados', E'E quantos convidados você pretende chamar pra essa festa mágica? 🎈\n\n👥 Responda com o *número*:', NULL, NULL, 'guest_count', 400, 1150, 13, true, false),
  (v_completion, v_flow_id, 'message', 'Resumo', E'Perfeito, {customer_name}! 🏰✨\n\nAnotei tudo aqui:\n\n📅 Mês: {event_date}\n🗓️ Dia: {dia}\n👥 Convidados: {guest_count}\n\n{customer_name}, agora eu irei te enviar algumas fotos e vídeo no nosso espaço !!', NULL, NULL, NULL, 400, 1330, 14, false, false),
  (v_send_photos, v_flow_id, 'action', 'Enviar Fotos', E'✨ Conheça nosso espaço incrível! 🏰🎉', 'send_media', NULL, NULL, 400, 1510, 15, false, false),
  (v_delay1, v_flow_id, 'delay', 'Espera 1', NULL, NULL, '{"delay_seconds": 10}', NULL, 400, 1690, 16, false, false),
  (v_send_pdf, v_flow_id, 'action', 'Enviar PDF', E'📋 Oi {customer_name}! Segue o pacote completo para {guest_count} na unidade {unidade}. 💜', 'send_pdf', NULL, NULL, 400, 1870, 17, false, false),
  (v_delay2, v_flow_id, 'delay', 'Espera 2', NULL, NULL, '{"delay_seconds": 10}', NULL, 400, 2050, 18, false, false),
  (v_send_video, v_flow_id, 'action', 'Enviar Vídeo', NULL, 'send_video', NULL, NULL, 400, 2210, 19, false, false),
  (v_proximo, v_flow_id, 'question', 'Próximo Passo', E'E agora, como você gostaria de continuar? 🤔\n\nResponda com o *número*:', NULL, NULL, NULL, 400, 2390, 20, false, false),
  (v_visita_msg, v_flow_id, 'message', 'Resposta Visita', E'Ótima escolha! 🏰✨\n\nNossa equipe vai entrar em contato para agendar sua visita ao Castelo da Diversão!\n\nAguarde um momento que já vamos te chamar! 👑', NULL, NULL, NULL, 80, 2590, 21, false, false),
  (v_schedule_visit, v_flow_id, 'action', 'Agendar Visita', NULL, 'schedule_visit', NULL, NULL, 80, 2770, 22, false, false),
  (v_end_visita, v_flow_id, 'end', 'Fim Visita', NULL, NULL, NULL, NULL, 80, 2950, 23, false, false),
  (v_duvidas_msg, v_flow_id, 'message', 'Resposta Dúvidas', E'Claro! 💬\n\nPode mandar sua dúvida aqui que nossa equipe já vai te responder!\n\nEstamos à disposição! 👑', NULL, NULL, NULL, 400, 2590, 24, false, false),
  (v_handoff_duvidas, v_flow_id, 'action', 'Transbordo Dúvidas', NULL, 'handoff', NULL, NULL, 400, 2770, 25, false, false),
  (v_end_duvidas, v_flow_id, 'end', 'Fim Dúvidas', NULL, NULL, NULL, NULL, 400, 2950, 26, false, false),
  (v_calma_msg, v_flow_id, 'message', 'Resposta Calma', E'Sem problemas! 📋\n\nClaro, fique a vontade. Se tiver alguma dúvida, estamos à disposição!\n\nQuando estiver pronto, é só chamar aqui! 👑✨', NULL, NULL, NULL, 720, 2590, 27, false, false),
  (v_disable_followup, v_flow_id, 'action', 'Desativar Follow-ups', NULL, 'disable_followup', NULL, NULL, 720, 2770, 28, false, false),
  (v_end_calma, v_flow_id, 'end', 'Fim Calma', NULL, NULL, NULL, NULL, 720, 2950, 29, false, false);

  INSERT INTO flow_node_options (id, node_id, label, value, display_order) VALUES
  (v_opt_cliente, v_tipo, 'Já sou cliente', '1', 1),
  (v_opt_orcamento, v_tipo, 'Quero um orçamento', '2', 2),
  (v_opt_trabalhe, v_tipo, 'Trabalhe no Castelo', '3', 3),
  (v_opt_mes2, v_mes, 'Fevereiro', '2', 1),
  (v_opt_mes3, v_mes, 'Março', '3', 2),
  (v_opt_mes4, v_mes, 'Abril', '4', 3),
  (v_opt_mes5, v_mes, 'Maio', '5', 4),
  (v_opt_mes6, v_mes, 'Junho', '6', 5),
  (v_opt_mes7, v_mes, 'Julho', '7', 6),
  (v_opt_mes8, v_mes, 'Agosto', '8', 7),
  (v_opt_mes9, v_mes, 'Setembro', '9', 8),
  (v_opt_mes10, v_mes, 'Outubro', '10', 9),
  (v_opt_mes11, v_mes, 'Novembro', '11', 10),
  (v_opt_mes12, v_mes, 'Dezembro', '12', 11),
  (v_opt_dia1, v_dia, 'Segunda a Quinta', '1', 1),
  (v_opt_dia2, v_dia, 'Sexta', '2', 2),
  (v_opt_dia3, v_dia, 'Sábado', '3', 3),
  (v_opt_dia4, v_dia, 'Domingo', '4', 4),
  (v_opt_conv1, v_convidados, '50 pessoas', '1', 1),
  (v_opt_conv2, v_convidados, '60 pessoas', '2', 2),
  (v_opt_conv3, v_convidados, '70 pessoas', '3', 3),
  (v_opt_conv4, v_convidados, '80 pessoas', '4', 4),
  (v_opt_conv5, v_convidados, '90 pessoas', '5', 5),
  (v_opt_conv6, v_convidados, '100 pessoas', '6', 6),
  (v_opt_prox1, v_proximo, 'Agendar visita', '1', 1),
  (v_opt_prox2, v_proximo, 'Tirar dúvidas', '2', 2),
  (v_opt_prox3, v_proximo, 'Analisar com calma', '3', 3);

  INSERT INTO flow_edges (flow_id, source_node_id, target_node_id, source_option_id, condition_type, condition_value, condition_value_label, display_order) VALUES
  (v_flow_id, v_start, v_tipo, NULL, NULL, NULL, NULL, 0),
  (v_flow_id, v_tipo, v_mark_cliente, v_opt_cliente::text, 'option_selected', '1', 'Já sou cliente', 1),
  (v_flow_id, v_tipo, v_nome, v_opt_orcamento::text, 'option_selected', '2', 'Quero um orçamento', 2),
  (v_flow_id, v_tipo, v_trabalhe_msg, v_opt_trabalhe::text, 'option_selected', '3', 'Trabalhe no Castelo', 3),
  (v_flow_id, v_mark_cliente, v_transfer_cliente, NULL, NULL, NULL, NULL, 4),
  (v_flow_id, v_transfer_cliente, v_handoff_cliente, NULL, NULL, NULL, NULL, 5),
  (v_flow_id, v_handoff_cliente, v_end_cliente, NULL, NULL, NULL, NULL, 6),
  (v_flow_id, v_trabalhe_msg, v_handoff_trabalhe, NULL, NULL, NULL, NULL, 7),
  (v_flow_id, v_handoff_trabalhe, v_end_trabalhe, NULL, NULL, NULL, NULL, 8),
  (v_flow_id, v_nome, v_prazer, NULL, NULL, NULL, NULL, 9),
  (v_flow_id, v_prazer, v_mes, NULL, NULL, NULL, NULL, 10),
  (v_flow_id, v_mes, v_dia, NULL, NULL, NULL, NULL, 11),
  (v_flow_id, v_dia, v_convidados, NULL, NULL, NULL, NULL, 12),
  (v_flow_id, v_convidados, v_completion, NULL, NULL, NULL, NULL, 13),
  (v_flow_id, v_completion, v_send_photos, NULL, NULL, NULL, NULL, 14),
  (v_flow_id, v_send_photos, v_delay1, NULL, NULL, NULL, NULL, 15),
  (v_flow_id, v_delay1, v_send_pdf, NULL, NULL, NULL, NULL, 16),
  (v_flow_id, v_send_pdf, v_delay2, NULL, NULL, NULL, NULL, 17),
  (v_flow_id, v_delay2, v_send_video, NULL, NULL, NULL, NULL, 18),
  (v_flow_id, v_send_video, v_proximo, NULL, NULL, NULL, NULL, 19),
  (v_flow_id, v_proximo, v_visita_msg, v_opt_prox1::text, 'option_selected', '1', 'Agendar visita', 20),
  (v_flow_id, v_proximo, v_duvidas_msg, v_opt_prox2::text, 'option_selected', '2', 'Tirar dúvidas', 21),
  (v_flow_id, v_proximo, v_calma_msg, v_opt_prox3::text, 'option_selected', '3', 'Analisar com calma', 22),
  (v_flow_id, v_visita_msg, v_schedule_visit, NULL, NULL, NULL, NULL, 23),
  (v_flow_id, v_schedule_visit, v_end_visita, NULL, NULL, NULL, NULL, 24),
  (v_flow_id, v_duvidas_msg, v_handoff_duvidas, NULL, NULL, NULL, NULL, 25),
  (v_flow_id, v_handoff_duvidas, v_end_duvidas, NULL, NULL, NULL, NULL, 26),
  (v_flow_id, v_calma_msg, v_disable_followup, NULL, NULL, NULL, NULL, 27),
  (v_flow_id, v_disable_followup, v_end_calma, NULL, NULL, NULL, NULL, 28);
END $$;
