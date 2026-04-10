-- Corrigir nome da empresa de "MegaMegic" para "Mega Magic"
UPDATE public.companies SET name = 'Mega Magic' WHERE id = '84f6a011-a1e1-4a2a-96f6-38da92a319ce';

-- Padronizar unit dos materiais de venda para "Mega Magic" (igual à instância do WhatsApp)
UPDATE public.sales_materials SET unit = 'Mega Magic' WHERE company_id = '84f6a011-a1e1-4a2a-96f6-38da92a319ce';