INSERT INTO public.permission_definitions (code, category, name, description, is_active, sort_order)
VALUES ('agenda.faturamento', 'agenda', 'Ver faturamento', 'Permite visualizar o card de faturamento confirmado na Agenda', true, 50)
ON CONFLICT DO NOTHING;