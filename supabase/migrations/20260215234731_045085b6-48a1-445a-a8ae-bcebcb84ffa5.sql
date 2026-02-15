INSERT INTO public.permission_definitions (code, name, description, category, sort_order, is_active)
VALUES
  ('agenda.view', 'Ver Agenda', 'Visualizar o calendário de festas e eventos', 'Agenda', 1, true),
  ('agenda.manage', 'Gerenciar Agenda', 'Criar, editar e excluir eventos no calendário', 'Agenda', 2, true);