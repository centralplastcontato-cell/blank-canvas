-- Add permission for editing lead names inline in Kanban
INSERT INTO public.permission_definitions (code, name, description, category, sort_order, is_active)
VALUES ('leads.edit.name', 'Editar nome do lead', 'Permite editar o nome do lead diretamente nos cards do CRM', 'Leads', 21, true);