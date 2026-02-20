
-- 2. Criar opção "Manhã (até meio-dia)" no novo nó
INSERT INTO flow_node_options (id, node_id, label, value, display_order)
VALUES (
  gen_random_uuid(),
  '4b0109b4-fdac-4f8b-ab9c-9cda6cd60718',
  'Manhã (até meio-dia)',
  'manha',
  0
)
RETURNING id;
