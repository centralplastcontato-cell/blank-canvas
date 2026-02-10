
-- Step 1: Enable flow_builder module for Castelo da Diversão
UPDATE companies 
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{enabled_modules,flow_builder}',
  'true'::jsonb
)
WHERE id = 'a0000000-0000-0000-0000-000000000001';

-- Step 2: Create the conversation flow
INSERT INTO conversation_flows (id, company_id, name, description, is_active, is_default)
VALUES (
  'f0f00000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Fluxo de Boas-vindas',
  'Fluxo padrão para qualificação de leads - Castelo da Diversão',
  true,
  true
);

-- Step 3: Create flow nodes
INSERT INTO flow_nodes (id, flow_id, node_type, title, position_x, position_y, display_order)
VALUES ('a1a10000-0000-0000-0000-000000000001', 'f0f00000-0000-0000-0000-000000000001', 'start', 'Início', 100, 200, 0);

INSERT INTO flow_nodes (id, flow_id, node_type, title, message_template, position_x, position_y, display_order)
VALUES ('a1a10000-0000-0000-0000-000000000002', 'f0f00000-0000-0000-0000-000000000001', 'message', 'Boas-vindas', E'Olá! Bem-vindo ao Castelo da Diversão! 🎉\nVamos te ajudar a planejar sua festa.', 450, 200, 1);

INSERT INTO flow_nodes (id, flow_id, node_type, title, message_template, extract_field, position_x, position_y, display_order)
VALUES ('a1a10000-0000-0000-0000-000000000003', 'f0f00000-0000-0000-0000-000000000001', 'question', 'Nome do Cliente', 'Qual é o seu nome?', 'customer_name', 800, 200, 2);

INSERT INTO flow_nodes (id, flow_id, node_type, title, message_template, position_x, position_y, display_order)
VALUES ('a1a10000-0000-0000-0000-000000000004', 'f0f00000-0000-0000-0000-000000000001', 'question', 'Mês da Festa', E'Para qual mês você está planejando a festa? Digite o número:\n\n*1* - Este mês\n*2* - Próximo mês\n*3* - Daqui 2+ meses', 1150, 200, 3);

INSERT INTO flow_nodes (id, flow_id, node_type, title, message_template, position_x, position_y, display_order)
VALUES ('a1a10000-0000-0000-0000-000000000005', 'f0f00000-0000-0000-0000-000000000001', 'end', 'Fim', E'Obrigado {nome}! Um atendente vai entrar em contato em breve. 😊', 1500, 200, 4);

-- Step 4: Create options for month question (Node 4)
INSERT INTO flow_node_options (id, node_id, label, value, display_order) VALUES
('b2b20000-0000-0000-0000-000000000001', 'a1a10000-0000-0000-0000-000000000004', 'Este mês', '1', 0),
('b2b20000-0000-0000-0000-000000000002', 'a1a10000-0000-0000-0000-000000000004', 'Próximo mês', '2', 1),
('b2b20000-0000-0000-0000-000000000003', 'a1a10000-0000-0000-0000-000000000004', 'Daqui 2+ meses', '3', 2);

-- Step 5: Create edges
INSERT INTO flow_edges (flow_id, source_node_id, target_node_id, condition_type, display_order)
VALUES ('f0f00000-0000-0000-0000-000000000001', 'a1a10000-0000-0000-0000-000000000001', 'a1a10000-0000-0000-0000-000000000002', 'fallback', 0);

INSERT INTO flow_edges (flow_id, source_node_id, target_node_id, condition_type, display_order)
VALUES ('f0f00000-0000-0000-0000-000000000001', 'a1a10000-0000-0000-0000-000000000002', 'a1a10000-0000-0000-0000-000000000003', 'fallback', 1);

INSERT INTO flow_edges (flow_id, source_node_id, target_node_id, condition_type, display_order)
VALUES ('f0f00000-0000-0000-0000-000000000001', 'a1a10000-0000-0000-0000-000000000003', 'a1a10000-0000-0000-0000-000000000004', 'fallback', 2);

INSERT INTO flow_edges (flow_id, source_node_id, target_node_id, source_option_id, condition_type, display_order)
VALUES ('f0f00000-0000-0000-0000-000000000001', 'a1a10000-0000-0000-0000-000000000004', 'a1a10000-0000-0000-0000-000000000005', 'b2b20000-0000-0000-0000-000000000001', 'option_selected', 3);

INSERT INTO flow_edges (flow_id, source_node_id, target_node_id, source_option_id, condition_type, display_order)
VALUES ('f0f00000-0000-0000-0000-000000000001', 'a1a10000-0000-0000-0000-000000000004', 'a1a10000-0000-0000-0000-000000000005', 'b2b20000-0000-0000-0000-000000000002', 'option_selected', 4);

INSERT INTO flow_edges (flow_id, source_node_id, target_node_id, source_option_id, condition_type, display_order)
VALUES ('f0f00000-0000-0000-0000-000000000001', 'a1a10000-0000-0000-0000-000000000004', 'a1a10000-0000-0000-0000-000000000005', 'b2b20000-0000-0000-0000-000000000003', 'option_selected', 5);
