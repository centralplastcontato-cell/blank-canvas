
-- =============================================================
-- FLUXO COMERCIAL V2 – FOCO EM VISITA (MODO TESTE)
-- Ativo apenas para o número-piloto: 15981121710
-- is_default = false → nunca substitui o fluxo principal
-- =============================================================

DO $$
DECLARE
  v_flow_id     uuid;
  v_company_id  uuid;

  -- Node IDs
  n_start             uuid := gen_random_uuid();
  n_nome              uuid := gen_random_uuid();
  n_tipo              uuid := gen_random_uuid();
  n_mes               uuid := gen_random_uuid();
  n_dia               uuid := gen_random_uuid();
  n_convidados        uuid := gen_random_uuid();
  n_confirmacao       uuid := gen_random_uuid();
  n_fotos             uuid := gen_random_uuid();
  n_video             uuid := gen_random_uuid();
  n_pdf               uuid := gen_random_uuid();
  n_proposta_visita   uuid := gen_random_uuid();
  n_periodo           uuid := gen_random_uuid();
  n_confirmacao_vis   uuid := gen_random_uuid();
  n_end_visita        uuid := gen_random_uuid();
  n_duvida            uuid := gen_random_uuid();
  n_pos_duvida        uuid := gen_random_uuid();
  n_reconducao        uuid := gen_random_uuid();
  n_confirmacao_rec   uuid := gen_random_uuid();
  n_end_duvida        uuid := gen_random_uuid();
  n_cliente           uuid := gen_random_uuid();
  n_end_cliente       uuid := gen_random_uuid();
  n_trabalhe          uuid := gen_random_uuid();
  n_end_trabalhe      uuid := gen_random_uuid();

  -- Option IDs
  opt_tipo_cliente    uuid := gen_random_uuid();
  opt_tipo_orcamento  uuid := gen_random_uuid();
  opt_tipo_trabalhe   uuid := gen_random_uuid();

  opt_mes_1   uuid := gen_random_uuid();
  opt_mes_2   uuid := gen_random_uuid();
  opt_mes_3   uuid := gen_random_uuid();
  opt_mes_4   uuid := gen_random_uuid();
  opt_mes_5   uuid := gen_random_uuid();
  opt_mes_6   uuid := gen_random_uuid();
  opt_mes_7   uuid := gen_random_uuid();
  opt_mes_8   uuid := gen_random_uuid();
  opt_mes_9   uuid := gen_random_uuid();
  opt_mes_10  uuid := gen_random_uuid();
  opt_mes_11  uuid := gen_random_uuid();

  opt_dia_1   uuid := gen_random_uuid();
  opt_dia_2   uuid := gen_random_uuid();
  opt_dia_3   uuid := gen_random_uuid();
  opt_dia_4   uuid := gen_random_uuid();

  opt_conv_1  uuid := gen_random_uuid();
  opt_conv_2  uuid := gen_random_uuid();
  opt_conv_3  uuid := gen_random_uuid();
  opt_conv_4  uuid := gen_random_uuid();
  opt_conv_5  uuid := gen_random_uuid();
  opt_conv_6  uuid := gen_random_uuid();

  opt_vis_semana  uuid := gen_random_uuid();
  opt_vis_sabado  uuid := gen_random_uuid();
  opt_vis_duvida  uuid := gen_random_uuid();

  opt_per_manha   uuid := gen_random_uuid();
  opt_per_tarde   uuid := gen_random_uuid();
  opt_per_noite   uuid := gen_random_uuid();

  opt_rec_semana  uuid := gen_random_uuid();
  opt_rec_sabado  uuid := gen_random_uuid();

BEGIN
  -- Pega o company_id do Castelo (primeiro ativo)
  SELECT id INTO v_company_id
  FROM public.companies
  WHERE is_active = true
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Nenhuma empresa encontrada';
  END IF;

  -- Cria o fluxo
  INSERT INTO public.conversation_flows (id, company_id, name, description, is_active, is_default)
  VALUES (
    gen_random_uuid(),
    v_company_id,
    'Fluxo Comercial V2 – Foco em Visita (MODO TESTE)',
    'Fluxo exclusivo para o número-piloto 15981121710. Qualificação completa + condução ativa para visita.',
    true,
    false
  )
  RETURNING id INTO v_flow_id;

  RAISE NOTICE 'Fluxo criado: %', v_flow_id;

  -- =======================================================
  -- NODOS
  -- =======================================================

  -- START
  INSERT INTO public.flow_nodes (id, flow_id, node_type, title, message_template, display_order, position_x, position_y)
  VALUES (n_start, v_flow_id, 'start', 'Início', NULL, 0, 50, 200);

  -- 1. Perguntar nome
  INSERT INTO public.flow_nodes (id, flow_id, node_type, title, message_template, extract_field, allow_ai_interpretation, require_extraction, display_order, position_x, position_y)
  VALUES (n_nome, v_flow_id, 'question', 'Perguntar Nome',
    'Olá! 👋 Seja bem-vindo(a) ao Castelo de Festas!

Antes de começar, qual é o seu nome?',
    'customer_name', true, true, 1, 320, 200);

  -- 2. Tipo (cliente / orçamento / trabalhe conosco)
  INSERT INTO public.flow_nodes (id, flow_id, node_type, title, message_template, display_order, position_x, position_y)
  VALUES (n_tipo, v_flow_id, 'question', 'Tipo de Contato',
    '{{nome}}, como posso te ajudar hoje? 😊

*1* - Já sou cliente
*2* - Quero um orçamento
*3* - Trabalhe no Castelo',
    2, 590, 200);

  -- 3. Mês
  INSERT INTO public.flow_nodes (id, flow_id, node_type, title, message_template, extract_field, display_order, position_x, position_y)
  VALUES (n_mes, v_flow_id, 'question', 'Mês do Evento',
    'Que mês você está pensando para a festa? 🗓️

*1* - Fevereiro
*2* - Março
*3* - Abril
*4* - Maio
*5* - Junho
*6* - Julho
*7* - Agosto
*8* - Setembro
*9* - Outubro
*10* - Novembro
*11* - Dezembro',
    'event_date', 3, 860, 200);

  -- 4. Dia da semana
  INSERT INTO public.flow_nodes (id, flow_id, node_type, title, message_template, display_order, position_x, position_y)
  VALUES (n_dia, v_flow_id, 'question', 'Dia da Semana',
    'Qual dia da semana você prefere? 📅

*1* - Segunda a Quinta
*2* - Sexta
*3* - Sábado
*4* - Domingo',
    4, 1130, 200);

  -- 5. Número de convidados
  INSERT INTO public.flow_nodes (id, flow_id, node_type, title, message_template, extract_field, display_order, position_x, position_y)
  VALUES (n_convidados, v_flow_id, 'question', 'Número de Convidados',
    'Quantos convidados você está planejando? 🎉

*1* - 50 pessoas
*2* - 60 pessoas
*3* - 70 pessoas
*4* - 80 pessoas
*5* - 90 pessoas
*6* - 100 pessoas',
    'guest_count', 5, 1400, 200);

  -- 6. Confirmação do resumo
  INSERT INTO public.flow_nodes (id, flow_id, node_type, title, message_template, display_order, position_x, position_y)
  VALUES (n_confirmacao, v_flow_id, 'message', 'Confirmação do Resumo',
    'Perfeito, {{nome}}! 🎊

Deixa eu confirmar o que você me disse:

📅 *Mês:* {{mes}}
📆 *Dia:* {{dia}}
👥 *Convidados:* {{convidados}}

Agora vou te mostrar nosso espaço incrível! 😍',
    6, 1670, 200);

  -- 7. Enviar fotos
  INSERT INTO public.flow_nodes (id, flow_id, node_type, title, action_type, display_order, position_x, position_y)
  VALUES (n_fotos, v_flow_id, 'action', 'Enviar Galeria de Fotos', 'send_media', 7, 1940, 200);

  -- 8. Enviar vídeo
  INSERT INTO public.flow_nodes (id, flow_id, node_type, title, action_type, display_order, position_x, position_y)
  VALUES (n_video, v_flow_id, 'action', 'Enviar Vídeo da Unidade', 'send_video', 8, 2210, 200);

  -- 9. Enviar PDF
  INSERT INTO public.flow_nodes (id, flow_id, node_type, title, action_type, display_order, position_x, position_y)
  VALUES (n_pdf, v_flow_id, 'action', 'Enviar PDF de Orçamento', 'send_pdf', 9, 2480, 200);

  -- 10. ★ BLOCO NOVO – Proposta de visita
  INSERT INTO public.flow_nodes (id, flow_id, node_type, title, message_template, display_order, position_x, position_y)
  VALUES (n_proposta_visita, v_flow_id, 'question', 'Proposta de Visita',
    '{{nome}}, a maioria das famílias que fecham com a gente fazem uma visita rápida antes 😊

Ver o espaço pessoalmente faz MUITA diferença na decisão.

Você prefere conhecer:

*1* – Durante a semana
*2* – No sábado
*3* – Prefiro tirar uma dúvida primeiro',
    10, 2750, 200);

  -- 11. Período da visita (opções 1 ou 2)
  INSERT INTO public.flow_nodes (id, flow_id, node_type, title, message_template, extract_field, display_order, position_x, position_y)
  VALUES (n_periodo, v_flow_id, 'question', 'Melhor Período',
    'Perfeito 😍

Nossa visita é rápida (cerca de 15 minutos) e ajuda muito na decisão.

Qual melhor período pra você?

*1* – Manhã
*2* – Tarde
*3* – Noite',
    'preferred_slot', 11, 3020, 50);

  -- 12. Confirmação de visita agendada
  INSERT INTO public.flow_nodes (id, flow_id, node_type, title, message_template, display_order, position_x, position_y)
  VALUES (n_confirmacao_vis, v_flow_id, 'message', 'Confirmação de Visita',
    'Ótimo 🙌

Nossa equipe vai confirmar o melhor horário com você em breve!

Fico feliz que você queira conhecer nosso espaço pessoalmente 😊',
    12, 3290, 50);

  -- 13. END visita
  INSERT INTO public.flow_nodes (id, flow_id, node_type, title, display_order, position_x, position_y)
  VALUES (n_end_visita, v_flow_id, 'end', 'Fim – Visita Confirmada', 13, 3560, 50);

  -- 14. Tirar dúvida (opção 3)
  INSERT INTO public.flow_nodes (id, flow_id, node_type, title, message_template, display_order, position_x, position_y)
  VALUES (n_duvida, v_flow_id, 'question', 'Tirar Dúvida',
    'Claro 🙌

Qual sua principal dúvida?',
    14, 3020, 380);

  -- 15. Após responder a dúvida
  INSERT INTO public.flow_nodes (id, flow_id, node_type, title, message_template, display_order, position_x, position_y)
  VALUES (n_pos_duvida, v_flow_id, 'message', 'Resposta à Dúvida',
    'Ótima pergunta! Nossa equipe está pronta para te ajudar com qualquer detalhe 😊

E aproveitando… você já chegou a conhecer nosso espaço pessoalmente? 😊',
    15, 3290, 380);

  -- 16. Recondução para visita
  INSERT INTO public.flow_nodes (id, flow_id, node_type, title, message_template, display_order, position_x, position_y)
  VALUES (n_reconducao, v_flow_id, 'question', 'Recondução para Visita',
    'Que tal marcar uma visitinha rápida? É só 15 minutinhos e faz MUITA diferença! 😍

*1* – Durante a semana
*2* – No sábado',
    16, 3560, 380);

  -- 17. Confirmação pós recondução
  INSERT INTO public.flow_nodes (id, flow_id, node_type, title, message_template, display_order, position_x, position_y)
  VALUES (n_confirmacao_rec, v_flow_id, 'message', 'Confirmação Recondução',
    'Ótimo 🙌

Nossa equipe vai confirmar o melhor horário com você em breve!',
    17, 3830, 380);

  -- 18. END dúvida
  INSERT INTO public.flow_nodes (id, flow_id, node_type, title, display_order, position_x, position_y)
  VALUES (n_end_duvida, v_flow_id, 'end', 'Fim – Dúvida Resolvida', 18, 4100, 380);

  -- 19. Já sou cliente
  INSERT INTO public.flow_nodes (id, flow_id, node_type, title, action_type, display_order, position_x, position_y)
  VALUES (n_cliente, v_flow_id, 'action', 'Cliente Existente', 'mark_existing_customer', 19, 860, 50);

  -- 20. END cliente
  INSERT INTO public.flow_nodes (id, flow_id, node_type, title, display_order, position_x, position_y)
  VALUES (n_end_cliente, v_flow_id, 'end', 'Fim – Cliente Existente', 20, 1130, 50);

  -- 21. Trabalhe conosco
  INSERT INTO public.flow_nodes (id, flow_id, node_type, title, action_type, display_order, position_x, position_y)
  VALUES (n_trabalhe, v_flow_id, 'action', 'Trabalhe Conosco – RH', 'handoff', 21, 860, 380);

  -- 22. END trabalhe
  INSERT INTO public.flow_nodes (id, flow_id, node_type, title, display_order, position_x, position_y)
  VALUES (n_end_trabalhe, v_flow_id, 'end', 'Fim – Recrutamento', 22, 1130, 380);

  -- =======================================================
  -- OPTIONS
  -- =======================================================

  -- Tipo
  INSERT INTO public.flow_node_options (id, node_id, label, value, display_order) VALUES
    (opt_tipo_cliente,   n_tipo, 'Já sou cliente',       '1', 1),
    (opt_tipo_orcamento, n_tipo, 'Quero um orçamento',   '2', 2),
    (opt_tipo_trabalhe,  n_tipo, 'Trabalhe no Castelo',  '3', 3);

  -- Mês
  INSERT INTO public.flow_node_options (id, node_id, label, value, display_order) VALUES
    (opt_mes_1,  n_mes, 'Fevereiro',  '1', 1),
    (opt_mes_2,  n_mes, 'Março',      '2', 2),
    (opt_mes_3,  n_mes, 'Abril',      '3', 3),
    (opt_mes_4,  n_mes, 'Maio',       '4', 4),
    (opt_mes_5,  n_mes, 'Junho',      '5', 5),
    (opt_mes_6,  n_mes, 'Julho',      '6', 6),
    (opt_mes_7,  n_mes, 'Agosto',     '7', 7),
    (opt_mes_8,  n_mes, 'Setembro',   '8', 8),
    (opt_mes_9,  n_mes, 'Outubro',    '9', 9),
    (opt_mes_10, n_mes, 'Novembro',  '10', 10),
    (opt_mes_11, n_mes, 'Dezembro',  '11', 11);

  -- Dia da semana
  INSERT INTO public.flow_node_options (id, node_id, label, value, display_order) VALUES
    (opt_dia_1, n_dia, 'Segunda a Quinta', '1', 1),
    (opt_dia_2, n_dia, 'Sexta',            '2', 2),
    (opt_dia_3, n_dia, 'Sábado',           '3', 3),
    (opt_dia_4, n_dia, 'Domingo',          '4', 4);

  -- Convidados
  INSERT INTO public.flow_node_options (id, node_id, label, value, display_order) VALUES
    (opt_conv_1, n_convidados, '50 pessoas',  '1', 1),
    (opt_conv_2, n_convidados, '60 pessoas',  '2', 2),
    (opt_conv_3, n_convidados, '70 pessoas',  '3', 3),
    (opt_conv_4, n_convidados, '80 pessoas',  '4', 4),
    (opt_conv_5, n_convidados, '90 pessoas',  '5', 5),
    (opt_conv_6, n_convidados, '100 pessoas', '6', 6);

  -- Proposta de visita
  INSERT INTO public.flow_node_options (id, node_id, label, value, display_order) VALUES
    (opt_vis_semana, n_proposta_visita, 'Durante a semana',           '1', 1),
    (opt_vis_sabado, n_proposta_visita, 'No sábado',                  '2', 2),
    (opt_vis_duvida, n_proposta_visita, 'Prefiro tirar uma dúvida',   '3', 3);

  -- Período
  INSERT INTO public.flow_node_options (id, node_id, label, value, display_order) VALUES
    (opt_per_manha, n_periodo, 'Manhã',  '1', 1),
    (opt_per_tarde, n_periodo, 'Tarde',  '2', 2),
    (opt_per_noite, n_periodo, 'Noite',  '3', 3);

  -- Recondução
  INSERT INTO public.flow_node_options (id, node_id, label, value, display_order) VALUES
    (opt_rec_semana, n_reconducao, 'Durante a semana', '1', 1),
    (opt_rec_sabado, n_reconducao, 'No sábado',        '2', 2);

  -- =======================================================
  -- ARESTAS (EDGES)
  -- =======================================================

  -- start → nome
  INSERT INTO public.flow_edges (flow_id, source_node_id, target_node_id, display_order)
  VALUES (v_flow_id, n_start, n_nome, 1);

  -- nome → tipo
  INSERT INTO public.flow_edges (flow_id, source_node_id, target_node_id, display_order)
  VALUES (v_flow_id, n_nome, n_tipo, 2);

  -- tipo → cliente (opção 1)
  INSERT INTO public.flow_edges (flow_id, source_node_id, source_option_id, target_node_id, condition_type, condition_value, display_order)
  VALUES (v_flow_id, n_tipo, opt_tipo_cliente, n_cliente, 'option_selected', '1', 3);

  -- tipo → mês (opção 2 – orçamento)
  INSERT INTO public.flow_edges (flow_id, source_node_id, source_option_id, target_node_id, condition_type, condition_value, display_order)
  VALUES (v_flow_id, n_tipo, opt_tipo_orcamento, n_mes, 'option_selected', '2', 4);

  -- tipo → trabalhe (opção 3)
  INSERT INTO public.flow_edges (flow_id, source_node_id, source_option_id, target_node_id, condition_type, condition_value, display_order)
  VALUES (v_flow_id, n_tipo, opt_tipo_trabalhe, n_trabalhe, 'option_selected', '3', 5);

  -- cliente → end_cliente
  INSERT INTO public.flow_edges (flow_id, source_node_id, target_node_id, display_order)
  VALUES (v_flow_id, n_cliente, n_end_cliente, 6);

  -- trabalhe → end_trabalhe
  INSERT INTO public.flow_edges (flow_id, source_node_id, target_node_id, display_order)
  VALUES (v_flow_id, n_trabalhe, n_end_trabalhe, 7);

  -- mês → dia (qualquer opção)
  INSERT INTO public.flow_edges (flow_id, source_node_id, target_node_id, display_order)
  VALUES (v_flow_id, n_mes, n_dia, 8);

  -- dia → convidados
  INSERT INTO public.flow_edges (flow_id, source_node_id, target_node_id, display_order)
  VALUES (v_flow_id, n_dia, n_convidados, 9);

  -- convidados → confirmação
  INSERT INTO public.flow_edges (flow_id, source_node_id, target_node_id, display_order)
  VALUES (v_flow_id, n_convidados, n_confirmacao, 10);

  -- confirmação → fotos
  INSERT INTO public.flow_edges (flow_id, source_node_id, target_node_id, display_order)
  VALUES (v_flow_id, n_confirmacao, n_fotos, 11);

  -- fotos → vídeo
  INSERT INTO public.flow_edges (flow_id, source_node_id, target_node_id, display_order)
  VALUES (v_flow_id, n_fotos, n_video, 12);

  -- vídeo → PDF
  INSERT INTO public.flow_edges (flow_id, source_node_id, target_node_id, display_order)
  VALUES (v_flow_id, n_video, n_pdf, 13);

  -- PDF → proposta visita
  INSERT INTO public.flow_edges (flow_id, source_node_id, target_node_id, display_order)
  VALUES (v_flow_id, n_pdf, n_proposta_visita, 14);

  -- proposta → período (opções 1 e 2 – quer visitar)
  INSERT INTO public.flow_edges (flow_id, source_node_id, source_option_id, target_node_id, condition_type, condition_value, display_order)
  VALUES (v_flow_id, n_proposta_visita, opt_vis_semana, n_periodo, 'option_selected', '1', 15);

  INSERT INTO public.flow_edges (flow_id, source_node_id, source_option_id, target_node_id, condition_type, condition_value, display_order)
  VALUES (v_flow_id, n_proposta_visita, opt_vis_sabado, n_periodo, 'option_selected', '2', 16);

  -- proposta → dúvida (opção 3)
  INSERT INTO public.flow_edges (flow_id, source_node_id, source_option_id, target_node_id, condition_type, condition_value, display_order)
  VALUES (v_flow_id, n_proposta_visita, opt_vis_duvida, n_duvida, 'option_selected', '3', 17);

  -- período → confirmação_vis (qualquer opção)
  INSERT INTO public.flow_edges (flow_id, source_node_id, target_node_id, display_order)
  VALUES (v_flow_id, n_periodo, n_confirmacao_vis, 18);

  -- confirmação_vis → end_visita
  INSERT INTO public.flow_edges (flow_id, source_node_id, target_node_id, display_order)
  VALUES (v_flow_id, n_confirmacao_vis, n_end_visita, 19);

  -- dúvida → pós_dúvida
  INSERT INTO public.flow_edges (flow_id, source_node_id, target_node_id, display_order)
  VALUES (v_flow_id, n_duvida, n_pos_duvida, 20);

  -- pós_dúvida → recondução
  INSERT INTO public.flow_edges (flow_id, source_node_id, target_node_id, display_order)
  VALUES (v_flow_id, n_pos_duvida, n_reconducao, 21);

  -- recondução → confirmação_rec (qualquer opção)
  INSERT INTO public.flow_edges (flow_id, source_node_id, target_node_id, display_order)
  VALUES (v_flow_id, n_reconducao, n_confirmacao_rec, 22);

  -- confirmação_rec → end_duvida
  INSERT INTO public.flow_edges (flow_id, source_node_id, target_node_id, display_order)
  VALUES (v_flow_id, n_confirmacao_rec, n_end_duvida, 23);

  RAISE NOTICE '✅ Fluxo V2 criado com sucesso. flow_id = %', v_flow_id;

END $$;
