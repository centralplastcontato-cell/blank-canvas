-- Desativar materiais com URLs quebradas do storage antigo
UPDATE sales_materials 
SET is_active = false 
WHERE company_id = 'a0000000-0000-0000-0000-000000000001'
AND file_url LIKE '%knyzkwgdmclcwvzhdmyk%';

-- Também desativar materiais de coleção de fotos com photo_urls quebradas
UPDATE sales_materials 
SET is_active = false 
WHERE company_id = 'a0000000-0000-0000-0000-000000000001'
AND type = 'photo_collection'
AND photo_urls::text LIKE '%knyzkwgdmclcwvzhdmyk%';