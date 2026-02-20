
-- Deletar edges relacionadas ao nó "Período – Sábado"
DELETE FROM flow_edges WHERE id IN (
  'c3d4e5f6-a7b8-9012-cdef-123456789012',
  'f5699b9e-ce18-4367-8db9-385a0868b3c0',
  'e70ee266-7aa6-48b0-a2b3-1e5b71acdc18'
);

-- Deletar opção "Manhã (até meio-dia)" do nó
DELETE FROM flow_node_options WHERE id = 'b2c3d4e5-f6a7-8901-bcde-f12345678901';

-- Deletar o nó "Período – Sábado"
DELETE FROM flow_nodes WHERE id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
