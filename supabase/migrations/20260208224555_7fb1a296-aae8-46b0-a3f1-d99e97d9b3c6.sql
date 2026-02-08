-- Adicionar mais permissões para cobrir todas as funcionalidades do sistema
INSERT INTO permission_definitions (code, name, description, category, sort_order, is_active) VALUES
-- WhatsApp / Atendimento
('whatsapp.view', 'Acessar Central de Atendimento', 'Permite acessar a central de atendimento WhatsApp', 'WhatsApp', 1, true),
('whatsapp.send', 'Enviar Mensagens', 'Permite enviar mensagens pelo WhatsApp', 'WhatsApp', 2, true),
('whatsapp.materials', 'Enviar Materiais de Venda', 'Permite enviar PDFs, fotos e vídeos de vendas', 'WhatsApp', 3, true),
('whatsapp.audio', 'Enviar Áudios', 'Permite gravar e enviar mensagens de áudio', 'WhatsApp', 4, true),
('whatsapp.close', 'Fechar Conversas', 'Permite marcar conversas como fechadas', 'WhatsApp', 5, true),
('whatsapp.favorite', 'Favoritar Conversas', 'Permite marcar conversas como favoritas', 'WhatsApp', 6, true),
('whatsapp.bot.toggle', 'Ativar/Desativar Bot', 'Permite ativar ou desativar o bot em conversas', 'WhatsApp', 7, true),
('whatsapp.share.group', 'Compartilhar em Grupos', 'Permite compartilhar conversas em grupos internos', 'WhatsApp', 8, true),

-- Configurações
('config.view', 'Acessar Configurações', 'Permite acessar a página de configurações', 'Configurações', 1, true),
('config.bot', 'Configurar Bot', 'Permite alterar mensagens e comportamento do bot', 'Configurações', 2, true),
('config.templates', 'Gerenciar Templates', 'Permite criar e editar templates de mensagens', 'Configurações', 3, true),
('config.materials', 'Gerenciar Materiais de Venda', 'Permite adicionar e editar PDFs, fotos e vídeos', 'Configurações', 4, true),
('config.vip', 'Gerenciar Números VIP', 'Permite adicionar números que o bot ignora', 'Configurações', 5, true),
('config.connection', 'Gerenciar Conexão WhatsApp', 'Permite conectar/desconectar instâncias WhatsApp', 'Configurações', 6, true),

-- Dashboard
('dashboard.view', 'Acessar Dashboard', 'Permite visualizar o painel de métricas', 'Dashboard', 1, true),
('dashboard.metrics', 'Ver Métricas Detalhadas', 'Permite visualizar métricas avançadas e relatórios', 'Dashboard', 2, true),

-- Propostas B2B
('b2b.proposals.create', 'Criar Propostas', 'Permite criar novas propostas comerciais B2B', 'B2B', 1, true),
('b2b.proposals.edit', 'Editar Propostas', 'Permite editar propostas existentes', 'B2B', 2, true),
('b2b.leads.manage', 'Gerenciar Leads B2B', 'Permite editar status e informações de leads B2B', 'B2B', 3, true);