-- IA Conversacional (beta): consumo/custo por conversa + modelo só do número de teste.

-- Modelo usado só pelo número de teste (vazio = o mesmo dos clientes)
ALTER TABLE public.ai_agent_settings ADD COLUMN IF NOT EXISTS test_model text;

-- Uma linha por chamada paga à IA: resposta (chat), transcrição de áudio ou
-- descrição de foto. cost_usd é calculado na hora com a tabela de preços do
-- modelo (supabase/functions/_shared/ai-models.ts).
CREATE TABLE IF NOT EXISTS public.ai_agent_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  conversation_id uuid REFERENCES public.wapi_conversations(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.campaign_leads(id) ON DELETE SET NULL,
  provider text NOT NULL,
  model text NOT NULL,
  kind text NOT NULL DEFAULT 'chat',
  input_tokens integer NOT NULL DEFAULT 0,
  cached_input_tokens integer NOT NULL DEFAULT 0,
  cache_write_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  cost_usd numeric(12, 6) NOT NULL DEFAULT 0,
  is_test boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_agent_usage_company_created_idx
  ON public.ai_agent_usage (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_agent_usage_conversation_idx
  ON public.ai_agent_usage (conversation_id);

ALTER TABLE public.ai_agent_usage ENABLE ROW LEVEL SECURITY;

-- Só leitura pela tela; quem grava é a edge function (service role)
DROP POLICY IF EXISTS "Users can view ai usage for their companies" ON public.ai_agent_usage;
CREATE POLICY "Users can view ai usage for their companies"
  ON public.ai_agent_usage FOR SELECT TO authenticated
  USING (company_id IN (SELECT unnest(public.get_user_company_ids(auth.uid()))));
