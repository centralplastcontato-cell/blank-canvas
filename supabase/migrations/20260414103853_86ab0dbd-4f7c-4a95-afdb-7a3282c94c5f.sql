INSERT INTO public.permission_definitions (code, name, description, category, sort_order)
VALUES ('financial.consent', 'Requer consentimento financeiro', 'Ações financeiras deste usuário precisam de aprovação de um gestor', 'Financeiro', 60)
ON CONFLICT (code) DO NOTHING;