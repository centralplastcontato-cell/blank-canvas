-- Configurações do agente de IA conversacional (beta)
-- Um registro por empresa; a IA atende apenas a unidade configurada,
-- somente conversas/leads criados após activated_at.

CREATE TABLE IF NOT EXISTS public.ai_agent_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  unit text,
  activated_at timestamptz,
  extra_instructions text,
  visit_hours text NOT NULL DEFAULT 'Segunda a sexta, das 10:00 às 17:00, de meia em meia hora',
  model text NOT NULL DEFAULT 'gpt-4o-mini',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id)
);

ALTER TABLE public.ai_agent_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ai agent settings for their companies"
  ON public.ai_agent_settings FOR SELECT TO authenticated
  USING (company_id IN (SELECT unnest(public.get_user_company_ids(auth.uid()))));

CREATE POLICY "Users can insert ai agent settings for their companies"
  ON public.ai_agent_settings FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT unnest(public.get_user_company_ids(auth.uid()))));

CREATE POLICY "Users can update ai agent settings for their companies"
  ON public.ai_agent_settings FOR UPDATE TO authenticated
  USING (company_id IN (SELECT unnest(public.get_user_company_ids(auth.uid()))));
