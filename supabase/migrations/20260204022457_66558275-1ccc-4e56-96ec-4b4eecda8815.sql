-- Add permission definition for lead transfer
INSERT INTO public.permission_definitions (code, name, description, category, sort_order, is_active)
VALUES (
  'leads.transfer',
  'Transferir leads',
  'Permite transferir leads entre colaboradores',
  'Leads',
  25,
  true
)
ON CONFLICT (code) DO NOTHING;