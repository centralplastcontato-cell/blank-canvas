-- Add permission for editing lead description
INSERT INTO public.permission_definitions (code, name, description, category, sort_order, is_active)
VALUES ('leads.edit.description', 'Editar descrição do lead', 'Permite editar a descrição/observações do lead diretamente nos cards do CRM', 'Leads', 22, true);