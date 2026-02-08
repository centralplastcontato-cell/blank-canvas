-- Insert new permission definitions for WhatsApp configuration sections
INSERT INTO public.permission_definitions (code, name, category, description, sort_order, is_active)
VALUES 
  ('config.whatsapp.connection', 'Gerenciar Conexão', 'Configurações WhatsApp', 'Permite visualizar e gerenciar instâncias de conexão, QR Code e pareamento', 200, true),
  ('config.whatsapp.messages', 'Gerenciar Mensagens', 'Configurações WhatsApp', 'Permite criar e editar templates de mensagens rápidas', 201, true),
  ('config.whatsapp.notifications', 'Configurar Notificações', 'Configurações WhatsApp', 'Permite alterar configurações de som e alertas', 202, true),
  ('config.whatsapp.automations', 'Gerenciar Automações', 'Configurações WhatsApp', 'Permite configurar chatbot e respostas automáticas', 203, true),
  ('config.whatsapp.advanced', 'Configurações Avançadas', 'Configurações WhatsApp', 'Permite acesso a sincronização, cache e logs do sistema', 204, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;