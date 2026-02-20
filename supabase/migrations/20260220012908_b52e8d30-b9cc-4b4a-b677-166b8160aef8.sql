
-- ============================================================
-- PARTE 2: Corrigir template "Confirmação do Resumo" (remover {{dia}})
-- ============================================================
UPDATE flow_nodes
SET message_template = 'Perfeito, {{nome}}! 🎊

Deixa eu confirmar o que você me disse:

📅 *Mês:* {{mes}}
👥 *Convidados:* {{convidados}}

Agora vou te mostrar nosso espaço incrível! 😍'
WHERE id = 'e0ae6e5a-b808-4a0d-a54d-433937d02110';

-- ============================================================
-- PARTE 3: Criar nó "Período – Sábado"
-- ============================================================
INSERT INTO flow_nodes (
  id, flow_id, node_type, title, message_template,
  extract_field, position_x, position_y, display_order,
  allow_ai_interpretation, require_extraction
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  '541781b4-9df7-4f35-8f4c-28befd33030d',
  'question',
  'Período – Sábado',
  'Ótimo! Aos sábados o buffet atende até às 12h. 😊

Sua visita seria no período da manhã, combinado?',
  'preferred_slot',
  900, 600, 99,
  false, false
);

-- Criar opção única para o nó "Período – Sábado"
INSERT INTO flow_node_options (id, node_id, label, value, display_order)
VALUES (
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Manhã (até meio-dia)',
  'manha',
  1
);

-- ============================================================
-- Redirecionar arestas "No sábado" → "Período – Sábado"
-- (havia 2 arestas duplicadas, redireciona ambas)
-- ============================================================
UPDATE flow_edges
SET target_node_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
WHERE id IN ('f5699b9e-ce18-4367-8db9-385a0868b3c0', 'e70ee266-7aa6-48b0-a2b3-1e5b71acdc18');

-- ============================================================
-- Criar aresta: "Período – Sábado" → "Confirmação de Visita"
-- (opção "Manhã (até meio-dia)" leva ao mesmo destino do Melhor Período)
-- ============================================================
INSERT INTO flow_edges (
  id, flow_id, source_node_id, target_node_id,
  source_option_id, condition_type, condition_value, display_order
) VALUES (
  'c3d4e5f6-a7b8-9012-cdef-123456789012',
  '541781b4-9df7-4f35-8f4c-28befd33030d',
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'c690bce2-607f-492e-8be7-38b5c58e8604',
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'option_selected',
  'manha',
  1
);
