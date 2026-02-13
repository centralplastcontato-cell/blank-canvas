
CREATE OR REPLACE FUNCTION public.recalculate_lead_score(_lead_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  SELECT * INTO v_lead FROM public.campaign_leads WHERE id = _lead_id;
  IF NOT FOUND THEN RETURN; END IF;

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

  SELECT * INTO v_conv
  FROM public.wapi_conversations
  WHERE lead_id = _lead_id
  ORDER BY last_message_at DESC NULLS LAST
  LIMIT 1;

  IF v_conv IS NOT NULL AND v_conv.bot_data IS NOT NULL THEN
    IF (v_conv.bot_data->>'proximo_passo') = '1' THEN v_score := v_score + 30; END IF;
    IF (v_conv.bot_data->>'proximo_passo') = '2' THEN v_score := v_score + 10; END IF;
    IF (v_conv.bot_data->>'mes') IS NOT NULL THEN v_score := v_score + 10; END IF;
    IF (v_conv.bot_data->>'convidados') IS NOT NULL THEN v_score := v_score + 10; END IF;
  END IF;

  IF v_conv IS NOT NULL AND v_conv.bot_step = 'complete_final' THEN v_score := v_score + 10; END IF;

  IF v_lead.status = 'orcamento_enviado' THEN v_score := v_score + 20; END IF;
  IF v_lead.status = 'em_contato' THEN v_score := v_score + 15; END IF;
  IF v_lead.status = 'aguardando_resposta' THEN v_score := v_score + 10; END IF;

  IF v_conv IS NOT NULL AND v_conv.last_message_at IS NOT NULL AND v_conv.last_message_from_me = true THEN
    v_hours_since_customer := EXTRACT(EPOCH FROM (now() - v_conv.last_message_at)) / 3600.0;
    IF v_hours_since_customer >= 48 THEN v_score := v_score - 20;
    ELSIF v_hours_since_customer >= 24 THEN v_score := v_score - 10;
    END IF;
  END IF;

  SELECT count(*) INTO v_followup_count
  FROM public.lead_history
  WHERE lead_id = _lead_id AND action ILIKE '%follow%up%';

  IF v_followup_count >= 2 THEN v_score := v_score - 20; END IF;

  IF v_score < 0 THEN v_score := 0; END IF;
  IF v_score > 100 THEN v_score := 100; END IF;

  IF v_score <= 20 THEN v_temp := 'frio';
  ELSIF v_score <= 40 THEN v_temp := 'morno';
  ELSIF v_score <= 70 THEN v_temp := 'quente';
  ELSE v_temp := 'pronto';
  END IF;

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

  -- Priority flag: only for non-cold leads (score > 20)
  IF v_score > 60 THEN v_priority := true; END IF;
  IF v_score > 20 AND v_conv IS NOT NULL AND (v_conv.bot_data->>'proximo_passo') = '1' THEN v_priority := true; END IF;
  IF v_score > 20 AND v_lead.status = 'orcamento_enviado' THEN v_priority := true; END IF;

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
$function$;

-- Recalculate all leads
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM campaign_leads LOOP
    PERFORM recalculate_lead_score(r.id);
  END LOOP;
END;
$$;
