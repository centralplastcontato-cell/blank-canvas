
-- 1. Inserir o nó Qualificação IA (qualify) após a mensagem de confirmação do resumo
-- Vai ficar entre "Confirmação do Resumo" (e0ae6e5a) e "Enviar Galeria" (ebe7922b)
-- Posicionado após "Confirmação do Resumo" (pos: 2269, 243)

INSERT INTO flow_nodes (
  id, flow_id, node_type, title, message_template, extract_field,
  action_config, position_x, position_y, display_order
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '541781b4-9df7-4f35-8f4c-28befd33030d',
  'qualify',
  'Qualificação – Turno da Visita',
  'Para facilitar o agendamento, me conta: você prefere visitar nossa unidade de manhã, à tarde ou à noite? 😊

Pode falar livremente!',
  'preferred_slot',
  '{"qualify_context": "turno do dia para visita ao buffet: manhã, tarde ou noite"}'::jsonb,
  2650, 243,
  17
);

-- 2. Inserir as opções do nó qualify
INSERT INTO flow_node_options (id, node_id, label, value, display_order) VALUES
  ('b1c2d3e4-f5a6-7890-bcde-f12345678901', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Manhã', 'manha', 0),
  ('c2d3e4f5-a6b7-8901-cdef-123456789012', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Tarde', 'tarde', 1),
  ('d3e4f5a6-b7c8-9012-def0-234567890123', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Noite', 'noite', 2);

-- 3. Redirecionar a aresta que ia de "Confirmação do Resumo" para "Enviar Galeria"
-- para agora ir de "Confirmação do Resumo" → "Qualificação IA"
-- Primeiro: verificar quais edges saem do nó e0ae6e5a e atualizar
UPDATE flow_edges 
SET target_node_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
WHERE source_node_id = 'e0ae6e5a-b808-4a0d-a54d-433937d02110'
  AND flow_id = '541781b4-9df7-4f35-8f4c-28befd33030d';

-- 4. Criar edges do qualify → destinos (cada turno leva à "Enviar Galeria de Fotos")
-- Manhã → Enviar Galeria
INSERT INTO flow_edges (flow_id, source_node_id, target_node_id, source_option_id, condition_type, display_order) VALUES
  ('541781b4-9df7-4f35-8f4c-28befd33030d', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ebe7922b-f30d-4545-9aed-8bb2817f94a7', 'b1c2d3e4-f5a6-7890-bcde-f12345678901', 'option_selected', 30),
-- Tarde → Enviar Galeria
  ('541781b4-9df7-4f35-8f4c-28befd33030d', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ebe7922b-f30d-4545-9aed-8bb2817f94a7', 'c2d3e4f5-a6b7-8901-cdef-123456789012', 'option_selected', 31),
-- Noite → Enviar Galeria
  ('541781b4-9df7-4f35-8f4c-28befd33030d', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'ebe7922b-f30d-4545-9aed-8bb2817f94a7', 'd3e4f5a6-b7c8-9012-def0-234567890123', 'option_selected', 32);

-- 5. Ajustar posição do nó "Enviar Galeria" para acomodar o novo nó antes dele
UPDATE flow_nodes SET position_x = 3100, position_y = 243
WHERE id = 'ebe7922b-f30d-4545-9aed-8bb2817f94a7';
