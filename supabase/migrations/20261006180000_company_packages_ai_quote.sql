-- Quais pacotes a IA (beta) pode usar para passar valor e comparar.
-- Os demais (formatura, escolar, confraternização...) ficam com a equipe.
ALTER TABLE public.company_packages ADD COLUMN IF NOT EXISTS ai_quote boolean NOT NULL DEFAULT true;

-- Castelo da Diversão: só os três pacotes de aniversário ficam com a IA
UPDATE public.company_packages
SET ai_quote = false
WHERE company_id = 'a0000000-0000-0000-0000-000000000001'
  AND upper(name) NOT IN ('CASTELO', 'SUPER CASTELO', 'CASTELO PREMIUM');
