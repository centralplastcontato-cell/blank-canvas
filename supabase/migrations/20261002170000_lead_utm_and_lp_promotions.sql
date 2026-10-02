-- 1) UTMs do anúncio que trouxe o lead (preenchidas pelo chat de orçamento das LPs)
ALTER TABLE public.campaign_leads
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_content text;

-- 2) Interruptor das promoções das LPs. A LP lê esta tabela ao abrir: com
--    enabled = false a promoção some na hora, sem publicar nada.
CREATE TABLE IF NOT EXISTS public.lp_promotions (
  slug text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lp_promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Promoções das LPs são públicas para leitura" ON public.lp_promotions;
CREATE POLICY "Promoções das LPs são públicas para leitura"
  ON public.lp_promotions FOR SELECT
  TO anon, authenticated
  USING (true);

INSERT INTO public.lp_promotions (slug, enabled)
VALUES ('castelo-mes-das-criancas-2026', true)
ON CONFLICT (slug) DO NOTHING;
