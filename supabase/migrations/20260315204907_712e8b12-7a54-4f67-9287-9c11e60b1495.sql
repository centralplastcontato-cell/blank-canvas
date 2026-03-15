
ALTER TABLE public.company_events 
  ADD COLUMN IF NOT EXISTS data_fechamento_venda date,
  ADD COLUMN IF NOT EXISTS vendedor_responsavel_id uuid;
