-- Inteligência com IA (passo 3): por que o lead não fechou, o que os clientes
-- mais perguntam e o resumo da semana no WhatsApp do dono.
-- Quem grava é a edge function weekly-insights (service role); a tela só lê.

-- Uma análise por lead (a mais recente). last_message_at guarda até onde a
-- conversa foi lida, para não pagar duas vezes pela mesma conversa.
CREATE TABLE IF NOT EXISTS public.lead_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.campaign_leads(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.wapi_conversations(id) ON DELETE SET NULL,
  last_message_at timestamptz,
  lead_status text,
  motivo text NOT NULL,
  detalhe text,
  perguntas text[] NOT NULL DEFAULT '{}',
  objecoes text[] NOT NULL DEFAULT '{}',
  model text,
  analyzed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lead_id)
);

CREATE INDEX IF NOT EXISTS lead_insights_company_analyzed_idx
  ON public.lead_insights (company_id, analyzed_at DESC);

ALTER TABLE public.lead_insights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view lead insights for their companies" ON public.lead_insights;
CREATE POLICY "Users can view lead insights for their companies"
  ON public.lead_insights FOR SELECT TO authenticated
  USING (company_id IN (SELECT unnest(public.get_user_company_ids(auth.uid()))));

-- Uma linha por empresa e semana: o resumo de segunda só sai uma vez,
-- mesmo que a função seja chamada de novo.
CREATE TABLE IF NOT EXISTS public.weekly_insight_runs (
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  analyzed integer NOT NULL DEFAULT 0,
  summary_sent boolean NOT NULL DEFAULT false,
  summary_text text,
  error text,
  PRIMARY KEY (company_id, week_start)
);

ALTER TABLE public.weekly_insight_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view weekly insight runs for their companies" ON public.weekly_insight_runs;
CREATE POLICY "Users can view weekly insight runs for their companies"
  ON public.weekly_insight_runs FOR SELECT TO authenticated
  USING (company_id IN (SELECT unnest(public.get_user_company_ids(auth.uid()))));

-- Liga o módulo "Inteligência com IA" só no Castelo (Hub → Módulos → Gestão)
UPDATE public.companies
SET settings = jsonb_set(
  coalesce(settings, '{}'::jsonb),
  '{enabled_modules}',
  coalesce(settings -> 'enabled_modules', '{}'::jsonb) || '{"inteligencia_ia": true}'::jsonb,
  true
)
WHERE slug = 'castelo-da-diversao';
