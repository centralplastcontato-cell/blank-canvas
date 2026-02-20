
-- 1. Criar o nó "Período – Sábado"
INSERT INTO flow_nodes (id, flow_id, node_type, title, message_template, position_x, position_y, display_order)
VALUES (
  gen_random_uuid(),
  '541781b4-9df7-4f35-8f4c-28befd33030d',
  'question',
  'Período – Sábado',
  'Ótimo! Aos sábados o buffet atende até às 12h. 😊 Sua visita seria no período da manhã, combinado?',
  4025,
  450,
  99
)
RETURNING id;
