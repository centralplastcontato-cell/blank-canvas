
-- New nodes: Nome da Criança, Convidados, Ação Enviar Materiais
-- Insert between Nome(003) and Mês(004), and after Mês before Fim(005)

-- Node 6: Nome da Criança (after Nome do Cliente, before Convidados)
INSERT INTO flow_nodes (id, flow_id, node_type, title, message_template, extract_field, position_x, position_y, display_order)
VALUES ('a1a10000-0000-0000-0000-000000000006', 'f0f00000-0000-0000-0000-000000000001', 'question', 'Nome da Criança', 'Qual é o nome da criança aniversariante? 🎂', 'child_name', 1100, 50, 5);

-- Node 7: Quantidade de Convidados
INSERT INTO flow_nodes (id, flow_id, node_type, title, message_template, extract_field, position_x, position_y, display_order)
VALUES ('a1a10000-0000-0000-0000-000000000007', 'f0f00000-0000-0000-0000-000000000001', 'question', 'Qtd Convidados', 'Quantos convidados você pretende ter na festa? 👥', 'guests', 1450, 50, 6);

-- Node 8: Ação Enviar Materiais (after Mês options, before Fim)
INSERT INTO flow_nodes (id, flow_id, node_type, title, message_template, action_type, position_x, position_y, display_order)
VALUES ('a1a10000-0000-0000-0000-000000000008', 'f0f00000-0000-0000-0000-000000000001', 'action', 'Enviar Materiais', 'Enquanto isso, dá uma olhada nos nossos pacotes! 📋', 'send_materials', 1800, 50, 7);

-- Rewire edges:
-- 1) Remove old edge: Nome(003) -> Mês(004)
DELETE FROM flow_edges WHERE id = '85ec1bba-45dd-4dcb-8a6e-de72ae5a2aa9';

-- 2) Remove old edges: Mês options -> Fim(005)
DELETE FROM flow_edges WHERE id IN (
  'bea20218-35b2-4c21-8ff2-ec8b24e39a81',
  'efe12771-f1c0-40bb-9011-a0bbd3393dd3',
  '8defcd50-169e-4cfb-85c2-eac57dd07ed2'
);

-- 3) New edges: Nome(003) -> Nome Criança(006) -> Convidados(007) -> Mês(004)
INSERT INTO flow_edges (flow_id, source_node_id, target_node_id, condition_type, display_order)
VALUES ('f0f00000-0000-0000-0000-000000000001', 'a1a10000-0000-0000-0000-000000000003', 'a1a10000-0000-0000-0000-000000000006', 'fallback', 2);

INSERT INTO flow_edges (flow_id, source_node_id, target_node_id, condition_type, display_order)
VALUES ('f0f00000-0000-0000-0000-000000000001', 'a1a10000-0000-0000-0000-000000000006', 'a1a10000-0000-0000-0000-000000000007', 'fallback', 3);

INSERT INTO flow_edges (flow_id, source_node_id, target_node_id, condition_type, display_order)
VALUES ('f0f00000-0000-0000-0000-000000000001', 'a1a10000-0000-0000-0000-000000000007', 'a1a10000-0000-0000-0000-000000000004', 'fallback', 4);

-- 4) Mês options -> Enviar Materiais(008)
INSERT INTO flow_edges (flow_id, source_node_id, target_node_id, source_option_id, condition_type, display_order)
VALUES ('f0f00000-0000-0000-0000-000000000001', 'a1a10000-0000-0000-0000-000000000004', 'a1a10000-0000-0000-0000-000000000008', 'b2b20000-0000-0000-0000-000000000001', 'option_selected', 5);

INSERT INTO flow_edges (flow_id, source_node_id, target_node_id, source_option_id, condition_type, display_order)
VALUES ('f0f00000-0000-0000-0000-000000000001', 'a1a10000-0000-0000-0000-000000000004', 'a1a10000-0000-0000-0000-000000000008', 'b2b20000-0000-0000-0000-000000000002', 'option_selected', 6);

INSERT INTO flow_edges (flow_id, source_node_id, target_node_id, source_option_id, condition_type, display_order)
VALUES ('f0f00000-0000-0000-0000-000000000001', 'a1a10000-0000-0000-0000-000000000004', 'a1a10000-0000-0000-0000-000000000008', 'b2b20000-0000-0000-0000-000000000003', 'option_selected', 7);

-- 5) Enviar Materiais(008) -> Fim(005)
INSERT INTO flow_edges (flow_id, source_node_id, target_node_id, condition_type, display_order)
VALUES ('f0f00000-0000-0000-0000-000000000001', 'a1a10000-0000-0000-0000-000000000008', 'a1a10000-0000-0000-0000-000000000005', 'fallback', 8);

-- Update Fim node position to accommodate new nodes
UPDATE flow_nodes SET position_x = 2150, position_y = 50 WHERE id = 'a1a10000-0000-0000-0000-000000000005';
UPDATE flow_nodes SET position_x = 1800, position_y = 200 WHERE id = 'a1a10000-0000-0000-0000-000000000008';
