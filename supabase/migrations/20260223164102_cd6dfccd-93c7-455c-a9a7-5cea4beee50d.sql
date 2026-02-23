INSERT INTO message_templates (name, template, is_active, sort_order, company_id)
VALUES
  ('Primeiro contato', 'Oi {{nome}}! Aqui é do {{empresa}}! Vi seu pedido para festa em {{mes}} com {{convidados}}. Vou te enviar as opções e valores!!', true, 0, '6bc204ae-1311-4c67-bb6b-9ab55dae9d11'),
  ('Follow-up', 'Oi {{nome}}! Tudo bem? Passando pra ver se você conseguiu avaliar o orçamento. Posso te ajudar a garantir sua data?', true, 1, '6bc204ae-1311-4c67-bb6b-9ab55dae9d11'),
  ('Envio de Orçamento', 'Oi {{nome}}! Segue seu orçamento com a promoção da campanha {{campanha}}.', true, 2, '6bc204ae-1311-4c67-bb6b-9ab55dae9d11'),
  ('Convite para visita', 'Gostaria de vir conhecer pessoalmente?', true, 3, '6bc204ae-1311-4c67-bb6b-9ab55dae9d11'),
  ('Convite para visita (completo)', 'Oi {{nome}}! Que legal que você está interessado(a) no {{empresa}}! Gostaria de agendar uma visita para conhecer nosso espaço? Temos horários disponíveis e seria um prazer receber você!', true, 4, '6bc204ae-1311-4c67-bb6b-9ab55dae9d11');