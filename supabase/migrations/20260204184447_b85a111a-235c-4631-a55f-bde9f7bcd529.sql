-- Add new permission for deleting leads from chat
INSERT INTO permission_definitions (code, name, description, category, sort_order, is_active)
VALUES (
  'leads.delete.from_chat',
  'Excluir Lead pelo Chat',
  'Permite excluir leads e suas conversas diretamente pelo WhatsApp',
  'Leads',
  50,
  true
) ON CONFLICT (code) DO NOTHING;