-- Migrate active sales materials from legacy units to the new unified unit "Castelo da Diversão"
UPDATE sales_materials
SET unit = 'Castelo da Diversão', updated_at = now()
WHERE company_id = 'a0000000-0000-0000-0000-000000000001'
  AND is_active = true
  AND unit IN ('Vendas 1', 'Vendas 2');