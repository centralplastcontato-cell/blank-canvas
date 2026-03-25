-- Fix contaminated leads: Aventura Kids leads incorrectly assigned to Castelo units
UPDATE public.campaign_leads
SET unit = 'Aventura Kids'
WHERE company_id = 'eb1776f0-142e-41db-9134-7d352d02c5bd'
  AND unit IN ('Vendas 1', 'Vendas 2');

-- Fix contaminated leads: Planeta Divertido leads incorrectly assigned to Castelo units
UPDATE public.campaign_leads
SET unit = 'Planeta Divertido'
WHERE company_id = '6bc204ae-1311-4c67-bb6b-9ab55dae9d11'
  AND unit IN ('Vendas 1', 'Vendas 2');