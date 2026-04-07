INSERT INTO public.permission_definitions (code, name, description, category, is_active, sort_order)
VALUES (
  'financial.bank_accounts',
  'Ver contas bancárias',
  'Permite visualizar e gerenciar contas bancárias cadastradas no módulo Financeiro e Operações',
  'Financeiro',
  true,
  45
)
ON CONFLICT DO NOTHING;