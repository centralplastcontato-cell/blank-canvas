-- Add B2B section permission
INSERT INTO permission_definitions (code, name, description, category, sort_order, is_active)
VALUES ('b2b.view', 'Acessar Comercial B2B', 'Permite visualizar a seção de materiais e leads B2B', 'Sistema', 80, true)
ON CONFLICT (code) DO NOTHING;