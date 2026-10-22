-- Pós-visita + ritmo das mensagens automáticas (Automações → Visitas)
-- 1) Liga/desliga por buffet
ALTER TABLE public.visit_confirmation_settings
  ADD COLUMN IF NOT EXISTS post_visit_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_one_per_day boolean NOT NULL DEFAULT false;

-- 2) Controle do pós-visita em cada visita (quantas mensagens saíram, quando, se o cliente respondeu)
ALTER TABLE public.lead_visits
  ADD COLUMN IF NOT EXISTS post_visit_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS post_visit_last_at timestamptz,
  ADD COLUMN IF NOT EXISTS post_visit_replied_at timestamptz;

-- 3) Liga no Castelo da Diversão (os outros buffets continuam como estão)
UPDATE public.visit_confirmation_settings
SET post_visit_enabled = true, auto_one_per_day = true
WHERE company_id = 'a0000000-0000-0000-0000-000000000001';

-- 4) Visitas antigas (antes de hoje − 1) não entram: o pós-visita começa com as de agora
UPDATE public.lead_visits
SET post_visit_count = 99
WHERE company_id = 'a0000000-0000-0000-0000-000000000001'
  AND data_visita < (now() AT TIME ZONE 'America/Sao_Paulo')::date - 1;
