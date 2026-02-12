
-- =============================================
-- 1. Tabela lead_intelligence
-- =============================================
CREATE TABLE public.lead_intelligence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.campaign_leads(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  temperature text NOT NULL DEFAULT 'frio',
  priority_flag boolean NOT NULL DEFAULT false,
  abandonment_type text,
  intent_tags jsonb DEFAULT '[]'::jsonb,
  last_customer_message_at timestamptz,
  last_agent_message_at timestamptz,
  followup_count integer DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(lead_id)
);

-- Indexes
CREATE INDEX idx_li_company_score ON public.lead_intelligence(company_id, score DESC);
CREATE INDEX idx_li_company_temp ON public.lead_intelligence(company_id, temperature);

-- RLS
ALTER TABLE public.lead_intelligence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view intelligence from their companies"
ON public.lead_intelligence FOR SELECT
USING ((company_id = ANY (public.get_user_company_ids(auth.uid()))) OR public.is_admin(auth.uid()));

CREATE POLICY "Users can insert intelligence in their companies"
ON public.lead_intelligence FOR INSERT
WITH CHECK ((company_id = ANY (public.get_user_company_ids(auth.uid()))) OR public.is_admin(auth.uid()));

CREATE POLICY "Users can update intelligence in their companies"
ON public.lead_intelligence FOR UPDATE
USING ((company_id = ANY (public.get_user_company_ids(auth.uid()))) OR public.is_admin(auth.uid()));

CREATE POLICY "Users can delete intelligence in their companies"
ON public.lead_intelligence FOR DELETE
USING ((company_id = ANY (public.get_user_company_ids(auth.uid()))) OR public.is_admin(auth.uid()));

-- Updated_at trigger
CREATE TRIGGER update_lead_intelligence_updated_at
BEFORE UPDATE ON public.lead_intelligence
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 2. Score calculation function (SECURITY DEFINER)
-- =============================================
CREATE OR REPLACE FUNCTION public.recalculate_lead_score(_lead_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score integer := 0;
  v_temp text;
  v_abandon text;
  v_lead record;
  v_conv record;
  v_followup_count integer;
  v_hours_since_customer double precision;
  v_priority boolean := false;
BEGIN
  -- Get lead data
  SELECT * INTO v_lead FROM public.campaign_leads WHERE id = _lead_id;
  IF NOT FOUND THEN RETURN; END IF;

  -- Fixed scores for terminal statuses
  IF v_lead.status = 'perdido' THEN
    INSERT INTO public.lead_intelligence (lead_id, company_id, score, temperature, priority_flag, abandonment_type, followup_count, updated_at)
    VALUES (_lead_id, v_lead.company_id, 0, 'frio', false, 'inativo', 0, now())
    ON CONFLICT (lead_id) DO UPDATE SET score = 0, temperature = 'frio', priority_flag = false, abandonment_type = 'inativo', updated_at = now();
    RETURN;
  END IF;

  IF v_lead.status = 'fechado' THEN
    INSERT INTO public.lead_intelligence (lead_id, company_id, score, temperature, priority_flag, updated_at)
    VALUES (_lead_id, v_lead.company_id, 100, 'pronto', false, now())
    ON CONFLICT (lead_id) DO UPDATE SET score = 100, temperature = 'pronto', priority_flag = false, abandonment_type = null, updated_at = now();
    RETURN;
  END IF;

  -- Get conversation data (latest conversation linked to this lead)
  SELECT * INTO v_conv
  FROM public.wapi_conversations
  WHERE lead_id = _lead_id
  ORDER BY last_message_at DESC NULLS LAST
  LIMIT 1;

  -- Positive scoring from bot_data
  IF v_conv IS NOT NULL AND v_conv.bot_data IS NOT NULL THEN
    IF (v_conv.bot_data->>'proximo_passo') = '1' THEN v_score := v_score + 30; END IF;
    IF (v_conv.bot_data->>'proximo_passo') = '2' THEN v_score := v_score + 10; END IF;
    IF (v_conv.bot_data->>'mes') IS NOT NULL THEN v_score := v_score + 10; END IF;
    IF (v_conv.bot_data->>'convidados') IS NOT NULL THEN v_score := v_score + 10; END IF;
  END IF;

  -- Positive scoring from bot_step
  IF v_conv IS NOT NULL AND v_conv.bot_step = 'complete_final' THEN v_score := v_score + 10; END IF;

  -- Positive scoring from lead status
  IF v_lead.status = 'orcamento_enviado' THEN v_score := v_score + 20; END IF;
  IF v_lead.status = 'em_contato' THEN v_score := v_score + 15; END IF;
  IF v_lead.status = 'aguardando_resposta' THEN v_score := v_score + 10; END IF;

  -- Negative scoring from timestamps
  IF v_conv IS NOT NULL AND v_conv.last_message_at IS NOT NULL AND v_conv.last_message_from_me = true THEN
    v_hours_since_customer := EXTRACT(EPOCH FROM (now() - v_conv.last_message_at)) / 3600.0;
    IF v_hours_since_customer >= 48 THEN v_score := v_score - 20;
    ELSIF v_hours_since_customer >= 24 THEN v_score := v_score - 10;
    END IF;
  END IF;

  -- Follow-up count from lead_history
  SELECT count(*) INTO v_followup_count
  FROM public.lead_history
  WHERE lead_id = _lead_id AND action ILIKE '%follow%up%';

  IF v_followup_count >= 2 THEN v_score := v_score - 20; END IF;

  -- Clamp score
  IF v_score < 0 THEN v_score := 0; END IF;
  IF v_score > 100 THEN v_score := 100; END IF;

  -- Derive temperature
  IF v_score <= 20 THEN v_temp := 'frio';
  ELSIF v_score <= 40 THEN v_temp := 'morno';
  ELSIF v_score <= 70 THEN v_temp := 'quente';
  ELSE v_temp := 'pronto';
  END IF;

  -- Derive abandonment_type
  v_abandon := null;
  IF v_conv IS NOT NULL AND v_conv.last_message_at IS NOT NULL THEN
    v_hours_since_customer := EXTRACT(EPOCH FROM (now() - v_conv.last_message_at)) / 3600.0;
    
    IF v_conv.bot_step IN ('welcome', 'nome', 'tipo') AND v_hours_since_customer >= 72 THEN
      v_abandon := 'inicial';
    ELSIF v_lead.status = 'orcamento_enviado' AND v_hours_since_customer >= 48 THEN
      v_abandon := 'pos_orcamento';
    ELSIF v_lead.status = 'em_contato' AND v_hours_since_customer >= 72 THEN
      v_abandon := 'pos_visita';
    ELSIF v_hours_since_customer >= 72 THEN
      v_abandon := 'inativo';
    END IF;
  END IF;

  -- Priority flag
  IF v_score > 60 THEN v_priority := true; END IF;
  IF v_conv IS NOT NULL AND (v_conv.bot_data->>'proximo_passo') = '1' THEN v_priority := true; END IF;
  IF v_lead.status = 'orcamento_enviado' THEN v_priority := true; END IF;

  -- Upsert
  INSERT INTO public.lead_intelligence (
    lead_id, company_id, score, temperature, priority_flag, abandonment_type,
    intent_tags, last_customer_message_at, last_agent_message_at, followup_count, updated_at
  ) VALUES (
    _lead_id, v_lead.company_id, v_score, v_temp, v_priority, v_abandon,
    '[]'::jsonb,
    CASE WHEN v_conv IS NOT NULL AND v_conv.last_message_from_me = false THEN v_conv.last_message_at ELSE null END,
    CASE WHEN v_conv IS NOT NULL AND v_conv.last_message_from_me = true THEN v_conv.last_message_at ELSE null END,
    v_followup_count, now()
  )
  ON CONFLICT (lead_id) DO UPDATE SET
    company_id = EXCLUDED.company_id,
    score = EXCLUDED.score,
    temperature = EXCLUDED.temperature,
    priority_flag = EXCLUDED.priority_flag,
    abandonment_type = EXCLUDED.abandonment_type,
    last_customer_message_at = EXCLUDED.last_customer_message_at,
    last_agent_message_at = EXCLUDED.last_agent_message_at,
    followup_count = EXCLUDED.followup_count,
    updated_at = now();
END;
$$;

-- =============================================
-- 3. Trigger functions
-- =============================================
CREATE OR REPLACE FUNCTION public.fn_trigger_recalc_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.recalculate_lead_score(NEW.id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_trigger_recalc_score_from_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.recalculate_lead_score(NEW.lead_id);
  RETURN NEW;
END;
$$;

-- Trigger on campaign_leads status change
CREATE TRIGGER trg_recalc_score_on_status
AFTER UPDATE OF status ON public.campaign_leads
FOR EACH ROW
EXECUTE FUNCTION public.fn_trigger_recalc_score();

-- Trigger on lead_history insert
CREATE TRIGGER trg_recalc_score_on_history
AFTER INSERT ON public.lead_history
FOR EACH ROW
EXECUTE FUNCTION public.fn_trigger_recalc_score_from_history();

-- =============================================
-- 4. Permission definitions
-- =============================================
INSERT INTO public.permission_definitions (code, name, description, category, sort_order)
VALUES
  ('ic.view', 'Acessar Inteligência', 'Permite visualizar o módulo Inteligência', 'Inteligência', 0),
  ('ic.export', 'Exportar Relatórios', 'Permite exportar dados de inteligência', 'Inteligência', 1);
