-- Deactivate Trujillo unit since it was replaced by Vendas 1 and Vendas 2
UPDATE company_units 
SET is_active = false 
WHERE company_id = 'a0000000-0000-0000-0000-000000000001' 
  AND slug = 'trujillo';