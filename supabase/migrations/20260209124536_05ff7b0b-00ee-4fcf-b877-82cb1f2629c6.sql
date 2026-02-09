-- Insert config.whatsapp permission definitions
INSERT INTO permission_definitions (code, name, description, category, sort_order) VALUES
  ('config.whatsapp.connection', 'Conexão WhatsApp', 'Permite visualizar e gerenciar conexões WhatsApp (QR Code, status)', 'Configurações WhatsApp', 100),
  ('config.whatsapp.messages', 'Mensagens WhatsApp', 'Permite gerenciar templates e legendas de mensagens', 'Configurações WhatsApp', 101),
  ('config.whatsapp.notifications', 'Notificações WhatsApp', 'Permite configurar sons e alertas de notificação', 'Configurações WhatsApp', 102),
  ('config.whatsapp.automations', 'Automações WhatsApp', 'Permite configurar chatbot e respostas automáticas', 'Configurações WhatsApp', 103),
  ('config.whatsapp.advanced', 'Avançado WhatsApp', 'Permite acesso a sincronização, logs e configurações avançadas', 'Configurações WhatsApp', 104)
ON CONFLICT (code) DO NOTHING;

-- Grant config.whatsapp.connection to comercial users (Jamile and Jessica)
INSERT INTO user_permissions (user_id, permission, granted, granted_by) VALUES
  ('fcb0aba4-cef8-4b94-b8bb-b0b777b81286', 'config.whatsapp.connection', true, 'f7dd4924-1b2f-4ff4-b63b-50043cd9eb6d'),
  ('1bb1b5c0-2f66-415f-b9d6-70ea81a25de9', 'config.whatsapp.connection', true, 'f7dd4924-1b2f-4ff4-b63b-50043cd9eb6d')
ON CONFLICT DO NOTHING;