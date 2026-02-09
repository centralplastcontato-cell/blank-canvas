
INSERT INTO public.permission_definitions (code, name, description, category, sort_order, is_active)
VALUES 
  ('leads.transfer', 'Transferir Leads', 'Permite transferir leads entre responsáveis', 'Leads', 60, true),
  ('leads.delete.from_chat', 'Excluir do Chat', 'Permite excluir leads/conversas diretamente do chat do WhatsApp', 'Leads', 70, true)
ON CONFLICT (code) DO NOTHING;
