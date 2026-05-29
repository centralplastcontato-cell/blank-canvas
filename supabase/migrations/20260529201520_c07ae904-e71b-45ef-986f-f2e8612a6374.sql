
-- Padronizar Vendas 2 → VENDAS 2 (mantém slug)
UPDATE public.company_units
SET name = 'VENDAS 2'
WHERE company_id = 'a0000000-0000-0000-0000-000000000001'
  AND slug = 'vendas-2';

-- Criar unidades faltantes para Castelo da Diversão
INSERT INTO public.company_units (company_id, name, slug, is_active, sort_order, color)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'VENDAS 1', 'vendas-1', true, 12, NULL),
  ('a0000000-0000-0000-0000-000000000001', 'VENDAS 3', 'vendas-3', true, 13, NULL),
  ('a0000000-0000-0000-0000-000000000001', 'VENDAS 4', 'vendas-4', true, 14, NULL)
ON CONFLICT DO NOTHING;
