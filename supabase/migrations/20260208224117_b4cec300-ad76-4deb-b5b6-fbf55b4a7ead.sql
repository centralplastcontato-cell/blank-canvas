-- Recriar todas as definições de permissões do sistema
INSERT INTO permission_definitions (code, name, description, category, sort_order, is_active) VALUES
-- Leads - Permissões básicas
('leads.view', 'Visualizar Leads', 'Permite visualizar a lista de leads e seus detalhes', 'Leads', 1, true),
('leads.edit', 'Editar Leads', 'Permite editar informações dos leads (status, observações, etc)', 'Leads', 2, true),
('leads.edit.name', 'Editar Nome do Lead', 'Permite alterar o nome do lead', 'Leads', 3, true),
('leads.edit.description', 'Editar Observações do Lead', 'Permite alterar as observações do lead', 'Leads', 4, true),
('leads.delete', 'Excluir Leads', 'Permite excluir leads do sistema', 'Leads', 5, true),
('leads.export', 'Exportar Leads', 'Permite exportar a lista de leads para PDF/Excel', 'Leads', 6, true),
('leads.assign', 'Atribuir Leads', 'Permite transferir leads entre responsáveis', 'Leads', 7, true),

-- Leads - Permissões de unidade
('leads.unit.all', 'Ver Todas as Unidades', 'Permite visualizar leads de todas as unidades', 'Leads', 10, true),
('leads.unit.manchester', 'Ver Unidade Manchester', 'Permite visualizar leads da unidade Manchester', 'Leads', 11, true),
('leads.unit.trujillo', 'Ver Unidade Trujillo', 'Permite visualizar leads da unidade Trujillo', 'Leads', 12, true),

-- Usuários
('users.view', 'Visualizar Usuários', 'Permite visualizar a lista de usuários do sistema', 'Usuários', 1, true),
('users.manage', 'Gerenciar Usuários', 'Permite criar, editar e desativar usuários', 'Usuários', 2, true),

-- Sistema
('permissions.manage', 'Gerenciar Permissões', 'Permite alterar permissões de outros usuários', 'Sistema', 1, true),
('b2b.view', 'Visualizar B2B', 'Permite acessar a área comercial B2B', 'Sistema', 2, true);