INSERT INTO permission_definitions (code, name, description, category, is_active, sort_order)
VALUES
  ('parceiro.view', 'Acessar Empresa Parceira', 'Permite visualizar o painel de empresa parceira', 'Empresa Parceira', true, 1),
  ('parceiro.catalogo', 'Gerenciar Catálogo', 'Permite gerenciar o catálogo de produtos do parceiro', 'Empresa Parceira', true, 2),
  ('parceiro.pedidos', 'Gerenciar Pedidos', 'Permite visualizar e gerenciar pedidos do parceiro', 'Empresa Parceira', true, 3)
ON CONFLICT DO NOTHING;