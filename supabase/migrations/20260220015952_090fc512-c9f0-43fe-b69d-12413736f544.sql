
-- 3. Edge: "No sábado" do nó "Proposta de Visita" → "Período – Sábado"
-- source_option_id = bb2a5283-ba0f-4d9b-afb2-bd3ec73aaeb0 (opção "No sábado")
INSERT INTO flow_edges (flow_id, source_node_id, target_node_id, source_option_id, condition_type, display_order)
VALUES (
  '541781b4-9df7-4f35-8f4c-28befd33030d',
  '795d4408-dad0-43b7-80f7-47a4f5b4f26f',
  '4b0109b4-fdac-4f8b-ab9c-9cda6cd60718',
  'bb2a5283-ba0f-4d9b-afb2-bd3ec73aaeb0',
  'option_selected',
  50
);

-- 4. Edge: opção "Manhã (até meio-dia)" → "Confirmação de Visita"
-- source_option_id = dd266792-64ab-4809-8a0a-29400925c02b
INSERT INTO flow_edges (flow_id, source_node_id, target_node_id, source_option_id, condition_type, display_order)
VALUES (
  '541781b4-9df7-4f35-8f4c-28befd33030d',
  '4b0109b4-fdac-4f8b-ab9c-9cda6cd60718',
  'c690bce2-607f-492e-8be7-38b5c58e8604',
  'dd266792-64ab-4809-8a0a-29400925c02b',
  'option_selected',
  51
);
