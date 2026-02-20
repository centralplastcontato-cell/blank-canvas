
-- Fix orphaned nodes: Confirmação Recondução and Fim – Dúvida Resolvida
-- Flow ID: 541781b4-9df7-4f35-8f4c-28befd33030d

-- Node IDs:
-- Tirar Dúvida:         c0b86406-c145-432b-8841-734e66d13d8c
-- Resposta à Dúvida:    21f1ca16-b652-4130-a7ae-c0edde53833f
-- Recondução para Visita: e949936e-1cd1-4390-8386-a8bbb8b1be83
-- Confirmação Recondução: e040b4b8-463c-4850-ac06-e525228ecb92
-- Fim – Dúvida Resolvida: f52d3238-37d9-4e02-acfa-83e799b49e6c
-- Melhor Período:        908885e1-4963-474f-9285-ff4ae2ecbb43
-- Recondução option "Durante a semana": a54936d0-4ae9-4a65-8f59-7316b649e472
-- Recondução option "No sábado":       c8c1a826-17a0-4b80-a387-ca11857713f9

-- Step 1: Redirect Recondução options → Confirmação Recondução (instead of Melhor Período)
UPDATE flow_edges
SET target_node_id = 'e040b4b8-463c-4850-ac06-e525228ecb92'
WHERE source_node_id = 'e949936e-1cd1-4390-8386-a8bbb8b1be83'
  AND source_option_id IN ('a54936d0-4ae9-4a65-8f59-7316b649e472', 'c8c1a826-17a0-4b80-a387-ca11857713f9');

-- Step 2: Connect Tirar Dúvida → Resposta à Dúvida (if not exists)
INSERT INTO flow_edges (id, flow_id, source_node_id, target_node_id, source_option_id, condition_type, display_order)
SELECT gen_random_uuid(), '541781b4-9df7-4f35-8f4c-28befd33030d', 'c0b86406-c145-432b-8841-734e66d13d8c', '21f1ca16-b652-4130-a7ae-c0edde53833f', NULL, NULL, 1
WHERE NOT EXISTS (
  SELECT 1 FROM flow_edges 
  WHERE source_node_id = 'c0b86406-c145-432b-8841-734e66d13d8c' 
    AND target_node_id = '21f1ca16-b652-4130-a7ae-c0edde53833f'
);

-- Step 3: Connect Resposta à Dúvida → Recondução para Visita (if not exists)
INSERT INTO flow_edges (id, flow_id, source_node_id, target_node_id, source_option_id, condition_type, display_order)
SELECT gen_random_uuid(), '541781b4-9df7-4f35-8f4c-28befd33030d', '21f1ca16-b652-4130-a7ae-c0edde53833f', 'e949936e-1cd1-4390-8386-a8bbb8b1be83', NULL, NULL, 1
WHERE NOT EXISTS (
  SELECT 1 FROM flow_edges 
  WHERE source_node_id = '21f1ca16-b652-4130-a7ae-c0edde53833f' 
    AND target_node_id = 'e949936e-1cd1-4390-8386-a8bbb8b1be83'
);

-- Step 4: Connect Confirmação Recondução → Fim – Dúvida Resolvida (if not exists)
INSERT INTO flow_edges (id, flow_id, source_node_id, target_node_id, source_option_id, condition_type, display_order)
SELECT gen_random_uuid(), '541781b4-9df7-4f35-8f4c-28befd33030d', 'e040b4b8-463c-4850-ac06-e525228ecb92', 'f52d3238-37d9-4e02-acfa-83e799b49e6c', NULL, NULL, 1
WHERE NOT EXISTS (
  SELECT 1 FROM flow_edges 
  WHERE source_node_id = 'e040b4b8-463c-4850-ac06-e525228ecb92' 
    AND target_node_id = 'f52d3238-37d9-4e02-acfa-83e799b49e6c'
);
