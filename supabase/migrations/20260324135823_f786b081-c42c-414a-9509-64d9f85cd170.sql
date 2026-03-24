
-- Deactivate Manchester unit
UPDATE company_units SET is_active = false WHERE id = '7c818abc-56f5-4cfe-87a7-dcb22a1b636e';

-- Rename wapi_instances
UPDATE wapi_instances SET unit = 'Vendas 1' WHERE id = '9b846163-9580-436b-a33e-1e0eca106514';
UPDATE wapi_instances SET unit = 'Vendas 2' WHERE id = '3f39419e-e7f5-4c3b-8ebd-1703e6c7a0c7';

-- Create internal units Vendas 1 and Vendas 2
INSERT INTO company_units (company_id, name, slug, is_active, sort_order)
VALUES 
  ('a0000000-0000-0000-0000-000000000001', 'Vendas 1', 'vendas-1', true, 10),
  ('a0000000-0000-0000-0000-000000000001', 'Vendas 2', 'vendas-2', true, 11)
ON CONFLICT DO NOTHING;
