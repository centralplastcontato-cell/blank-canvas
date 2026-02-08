-- Adicionar permissões de unidade
INSERT INTO public.permission_definitions (code, name, description, category, sort_order)
VALUES 
  ('leads.unit.all', 'Ver todas as unidades', 'Pode ver leads de todas as unidades', 'Leads', 5),
  ('leads.unit.manchester', 'Ver Manchester', 'Pode ver leads da unidade Manchester', 'Leads', 6),
  ('leads.unit.trujillo', 'Ver Trujillo', 'Pode ver leads da unidade Trujillo', 'Leads', 7)
ON CONFLICT (code) DO NOTHING;