-- Adicionar coluna para armazenar a unidade preferida do lead
ALTER TABLE public.campaign_leads
ADD COLUMN unit TEXT;