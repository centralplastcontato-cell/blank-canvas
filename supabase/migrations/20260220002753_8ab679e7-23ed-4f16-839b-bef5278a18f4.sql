
-- Fix: Remove generic edges from option-based nodes and create per-option edges
-- Flow ID: 541781b4-9df7-4f35-8f4c-28befd33030d

-- Step 1: Delete all edges from nodes that have options (source_option_id = null means generic/broken)
DELETE FROM flow_edges
WHERE source_node_id IN (
  '51814fc8-d0d1-4c83-97b7-3576197dbaa5', -- Tipo de Contato
  'e811533e-b67a-4acd-80af-28130781b381', -- Mês do Evento
  'fbf6827e-39c1-45bc-a1c6-3d3cefc8dbfb', -- Número de Convidados
  '795d4408-dad0-43b7-80f7-47a4f5b4f26f', -- Proposta de Visita
  '908885e1-4963-474f-9285-ff4ae2ecbb43', -- Melhor Período
  'e949936e-1cd1-4390-8386-a8bbb8b1be83'  -- Recondução para Visita
)
AND source_option_id IS NULL;

-- Step 2: Create per-option edges

-- TIPO DE CONTATO options:
-- "Já sou cliente" → Cliente Existente
INSERT INTO flow_edges (id, flow_id, source_node_id, target_node_id, source_option_id, condition_type, display_order)
VALUES (gen_random_uuid(), '541781b4-9df7-4f35-8f4c-28befd33030d', '51814fc8-d0d1-4c83-97b7-3576197dbaa5', 'a5d5e965-f9c5-4187-b08c-6fcb5d3897aa', 'ebfdf238-afc1-44c9-a3d5-66e2a1a71ccf', 'option_selected', 1);

-- "Quero um orçamento" → Mês do Evento
INSERT INTO flow_edges (id, flow_id, source_node_id, target_node_id, source_option_id, condition_type, display_order)
VALUES (gen_random_uuid(), '541781b4-9df7-4f35-8f4c-28befd33030d', '51814fc8-d0d1-4c83-97b7-3576197dbaa5', 'e811533e-b67a-4acd-80af-28130781b381', '1c9f37f9-cf9b-47da-bea3-40ca32686f6b', 'option_selected', 2);

-- "Trabalhe no Castelo" → Trabalhe Conosco – RH
INSERT INTO flow_edges (id, flow_id, source_node_id, target_node_id, source_option_id, condition_type, display_order)
VALUES (gen_random_uuid(), '541781b4-9df7-4f35-8f4c-28befd33030d', '51814fc8-d0d1-4c83-97b7-3576197dbaa5', '28bab650-76c9-4571-bfe1-60c6f7d27f24', '5e239501-05da-4a7e-83cf-ac14eb35d017', 'option_selected', 3);

-- MÊS DO EVENTO: all options → Número de Convidados
INSERT INTO flow_edges (id, flow_id, source_node_id, target_node_id, source_option_id, condition_type, display_order) VALUES
(gen_random_uuid(), '541781b4-9df7-4f35-8f4c-28befd33030d', 'e811533e-b67a-4acd-80af-28130781b381', 'fbf6827e-39c1-45bc-a1c6-3d3cefc8dbfb', 'dd5f1f61-475c-41c5-9c8d-ff44e373d9e4', 'option_selected', 1),
(gen_random_uuid(), '541781b4-9df7-4f35-8f4c-28befd33030d', 'e811533e-b67a-4acd-80af-28130781b381', 'fbf6827e-39c1-45bc-a1c6-3d3cefc8dbfb', 'e99b6c46-985d-4901-b880-87c27bd9a3a3', 'option_selected', 2),
(gen_random_uuid(), '541781b4-9df7-4f35-8f4c-28befd33030d', 'e811533e-b67a-4acd-80af-28130781b381', 'fbf6827e-39c1-45bc-a1c6-3d3cefc8dbfb', '1c93ef15-d169-43f4-9f56-a08b5e57101d', 'option_selected', 3),
(gen_random_uuid(), '541781b4-9df7-4f35-8f4c-28befd33030d', 'e811533e-b67a-4acd-80af-28130781b381', 'fbf6827e-39c1-45bc-a1c6-3d3cefc8dbfb', '7878eb7e-dd09-43a8-9ea1-0e49f35e828b', 'option_selected', 4),
(gen_random_uuid(), '541781b4-9df7-4f35-8f4c-28befd33030d', 'e811533e-b67a-4acd-80af-28130781b381', 'fbf6827e-39c1-45bc-a1c6-3d3cefc8dbfb', 'f1791f1b-65c1-4911-ad76-6afb8c161f94', 'option_selected', 5),
(gen_random_uuid(), '541781b4-9df7-4f35-8f4c-28befd33030d', 'e811533e-b67a-4acd-80af-28130781b381', 'fbf6827e-39c1-45bc-a1c6-3d3cefc8dbfb', '0d97dfe4-0b65-43ed-ac84-3f4bda142250', 'option_selected', 6),
(gen_random_uuid(), '541781b4-9df7-4f35-8f4c-28befd33030d', 'e811533e-b67a-4acd-80af-28130781b381', 'fbf6827e-39c1-45bc-a1c6-3d3cefc8dbfb', 'c1493bb4-b22d-4e74-8682-fe2fece7ecfc', 'option_selected', 7),
(gen_random_uuid(), '541781b4-9df7-4f35-8f4c-28befd33030d', 'e811533e-b67a-4acd-80af-28130781b381', 'fbf6827e-39c1-45bc-a1c6-3d3cefc8dbfb', 'd4a496a0-144c-4bb5-8b64-cdb9fe22f200', 'option_selected', 8),
(gen_random_uuid(), '541781b4-9df7-4f35-8f4c-28befd33030d', 'e811533e-b67a-4acd-80af-28130781b381', 'fbf6827e-39c1-45bc-a1c6-3d3cefc8dbfb', 'f7e5b234-e3af-4571-b372-6cb28fbcf054', 'option_selected', 9),
(gen_random_uuid(), '541781b4-9df7-4f35-8f4c-28befd33030d', 'e811533e-b67a-4acd-80af-28130781b381', 'fbf6827e-39c1-45bc-a1c6-3d3cefc8dbfb', '0b9b7471-a0ff-4a60-8af6-4bab56464b8f', 'option_selected', 10),
(gen_random_uuid(), '541781b4-9df7-4f35-8f4c-28befd33030d', 'e811533e-b67a-4acd-80af-28130781b381', 'fbf6827e-39c1-45bc-a1c6-3d3cefc8dbfb', 'e8c8a0cb-1adb-4599-8f01-7d34b9bcb209', 'option_selected', 11);

-- NÚMERO DE CONVIDADOS: all options → Confirmação do Resumo
INSERT INTO flow_edges (id, flow_id, source_node_id, target_node_id, source_option_id, condition_type, display_order) VALUES
(gen_random_uuid(), '541781b4-9df7-4f35-8f4c-28befd33030d', 'fbf6827e-39c1-45bc-a1c6-3d3cefc8dbfb', 'e0ae6e5a-b808-4a0d-a54d-433937d02110', 'db4bf4c7-8203-432a-aab9-4d9aa0233a7d', 'option_selected', 1),
(gen_random_uuid(), '541781b4-9df7-4f35-8f4c-28befd33030d', 'fbf6827e-39c1-45bc-a1c6-3d3cefc8dbfb', 'e0ae6e5a-b808-4a0d-a54d-433937d02110', '3eff3394-d11d-4bea-afd3-efaeb90dee40', 'option_selected', 2),
(gen_random_uuid(), '541781b4-9df7-4f35-8f4c-28befd33030d', 'fbf6827e-39c1-45bc-a1c6-3d3cefc8dbfb', 'e0ae6e5a-b808-4a0d-a54d-433937d02110', '246568e1-f598-47c9-ab78-b87c01409f14', 'option_selected', 3),
(gen_random_uuid(), '541781b4-9df7-4f35-8f4c-28befd33030d', 'fbf6827e-39c1-45bc-a1c6-3d3cefc8dbfb', 'e0ae6e5a-b808-4a0d-a54d-433937d02110', '5d273e6c-ecc0-4fe3-9d77-30bd1cfc0c75', 'option_selected', 4),
(gen_random_uuid(), '541781b4-9df7-4f35-8f4c-28befd33030d', 'fbf6827e-39c1-45bc-a1c6-3d3cefc8dbfb', 'e0ae6e5a-b808-4a0d-a54d-433937d02110', '5b02f9be-985f-48b7-b478-94479289b8ce', 'option_selected', 5),
(gen_random_uuid(), '541781b4-9df7-4f35-8f4c-28befd33030d', 'fbf6827e-39c1-45bc-a1c6-3d3cefc8dbfb', 'e0ae6e5a-b808-4a0d-a54d-433937d02110', 'a9464a53-fabd-4a16-8f29-8fc32e338333', 'option_selected', 6);

-- PROPOSTA DE VISITA options:
-- "Durante a semana" → Melhor Período
INSERT INTO flow_edges (id, flow_id, source_node_id, target_node_id, source_option_id, condition_type, display_order)
VALUES (gen_random_uuid(), '541781b4-9df7-4f35-8f4c-28befd33030d', '795d4408-dad0-43b7-80f7-47a4f5b4f26f', '908885e1-4963-474f-9285-ff4ae2ecbb43', 'a07d1f0d-88f2-460e-bfa7-77519ca2829c', 'option_selected', 1);

-- "No sábado" → Melhor Período
INSERT INTO flow_edges (id, flow_id, source_node_id, target_node_id, source_option_id, condition_type, display_order)
VALUES (gen_random_uuid(), '541781b4-9df7-4f35-8f4c-28befd33030d', '795d4408-dad0-43b7-80f7-47a4f5b4f26f', '908885e1-4963-474f-9285-ff4ae2ecbb43', 'bb2a5283-ba0f-4d9b-afb2-bd3ec73aaeb0', 'option_selected', 2);

-- "Prefiro tirar uma dúvida" → Tirar Dúvida
INSERT INTO flow_edges (id, flow_id, source_node_id, target_node_id, source_option_id, condition_type, display_order)
VALUES (gen_random_uuid(), '541781b4-9df7-4f35-8f4c-28befd33030d', '795d4408-dad0-43b7-80f7-47a4f5b4f26f', 'c0b86406-c145-432b-8841-734e66d13d8c', 'ddfa2bfa-a5ef-47aa-9c21-bee1ea8a1b90', 'option_selected', 3);

-- MELHOR PERÍODO: all options → Confirmação de Visita
INSERT INTO flow_edges (id, flow_id, source_node_id, target_node_id, source_option_id, condition_type, display_order) VALUES
(gen_random_uuid(), '541781b4-9df7-4f35-8f4c-28befd33030d', '908885e1-4963-474f-9285-ff4ae2ecbb43', 'c690bce2-607f-492e-8be7-38b5c58e8604', '81dc7634-de16-4b03-a1b4-5b5e7e90bb01', 'option_selected', 1),
(gen_random_uuid(), '541781b4-9df7-4f35-8f4c-28befd33030d', '908885e1-4963-474f-9285-ff4ae2ecbb43', 'c690bce2-607f-492e-8be7-38b5c58e8604', '4e17fc91-1f77-4c14-9053-3b20a59260a1', 'option_selected', 2),
(gen_random_uuid(), '541781b4-9df7-4f35-8f4c-28befd33030d', '908885e1-4963-474f-9285-ff4ae2ecbb43', 'c690bce2-607f-492e-8be7-38b5c58e8604', 'd50eea05-f875-4c17-bd1c-21fb72e07b52', 'option_selected', 3);

-- RECONDUÇÃO PARA VISITA: all options → Melhor Período
INSERT INTO flow_edges (id, flow_id, source_node_id, target_node_id, source_option_id, condition_type, display_order) VALUES
(gen_random_uuid(), '541781b4-9df7-4f35-8f4c-28befd33030d', 'e949936e-1cd1-4390-8386-a8bbb8b1be83', '908885e1-4963-474f-9285-ff4ae2ecbb43', 'a54936d0-4ae9-4a65-8f59-7316b649e472', 'option_selected', 1),
(gen_random_uuid(), '541781b4-9df7-4f35-8f4c-28befd33030d', 'e949936e-1cd1-4390-8386-a8bbb8b1be83', '908885e1-4963-474f-9285-ff4ae2ecbb43', 'c8c1a826-17a0-4b80-a387-ca11857713f9', 'option_selected', 2);
