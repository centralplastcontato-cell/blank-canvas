
-- 1. Deactivate all Manchester materials
UPDATE sales_materials SET is_active = false WHERE company_id = 'a0000000-0000-0000-0000-000000000001' AND unit = 'Manchester';

-- 2. Update existing Trujillo materials to unit = 'Vendas 2'
UPDATE sales_materials SET unit = 'Vendas 2' WHERE company_id = 'a0000000-0000-0000-0000-000000000001' AND unit = 'Trujillo';

-- 3. Duplicate Trujillo materials (now Vendas 2) for Vendas 1
INSERT INTO sales_materials (company_id, name, type, unit, file_url, file_path, photo_urls, guest_count, sort_order, is_active)
SELECT company_id, name, type, 'Vendas 1', file_url, file_path, photo_urls, guest_count, sort_order, is_active
FROM sales_materials
WHERE company_id = 'a0000000-0000-0000-0000-000000000001' AND unit = 'Vendas 2' AND is_active = true;
