-- Campanhas, etapa 1 (24/10): resultado honesto e "sair" só quando faz sentido.

-- 1) Resultado de cada campanha
--    - Responderam: mensagem do cliente em até 3 dias, sem contar o "sair/parar".
--    - Fecharam festa: só quem RESPONDEU à campanha e fechou em até 45 dias
--      (antes contava qualquer festa fechada no período, mesmo sem relação).
CREATE OR REPLACE FUNCTION public.campaign_results(p_company_id uuid)
RETURNS TABLE (campaign_id uuid, replied integer, closed integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ok AS (
    SELECT (public.is_admin(auth.uid()) OR public.user_has_company_access(auth.uid(), p_company_id)) AS allowed
  ),
  rec AS (
    SELECT cr.id, cr.campaign_id, cr.lead_id, cr.sent_at,
           right(regexp_replace(cr.phone, '\D', '', 'g'), 8) AS tail
    FROM public.campaign_recipients cr
    JOIN public.campaigns c ON c.id = cr.campaign_id
    CROSS JOIN ok
    WHERE ok.allowed AND c.company_id = p_company_id AND cr.status = 'sent' AND cr.sent_at IS NOT NULL
  ),
  conv AS MATERIALIZED (
    SELECT x.id, x.tail FROM (
      SELECT w.id, right(regexp_replace(split_part(w.remote_jid, '@', 1), '\D', '', 'g'), 8) AS tail
      FROM public.wapi_conversations w
      WHERE w.company_id = p_company_id AND w.remote_jid NOT LIKE '%@g.us'
    ) x WHERE length(x.tail) = 8
  ),
  lds AS MATERIALIZED (
    SELECT x.id, x.tail FROM (
      SELECT l.id, right(regexp_replace(coalesce(l.whatsapp, ''), '\D', '', 'g'), 8) AS tail
      FROM public.campaign_leads l
      WHERE l.company_id = p_company_id
    ) x WHERE length(x.tail) = 8
  ),
  replied AS (
    SELECT DISTINCT r.id
    FROM rec r
    JOIN conv cv ON cv.tail = r.tail
    WHERE EXISTS (
      SELECT 1 FROM public.wapi_messages m
      WHERE m.conversation_id = cv.id AND m.from_me = false
        AND m.timestamp > r.sent_at AND m.timestamp < r.sent_at + interval '3 days'
        AND lower(btrim(coalesce(m.content, ''))) !~ '^(sair|parar|pare|stop|descadastrar|remover|me remova|me tire da lista|não quero mais|nao quero mais|não quero receber|nao quero receber)[ .!]*$'
    )
  ),
  rec_leads AS (
    SELECT r.id, (r.sent_at AT TIME ZONE 'America/Sao_Paulo')::date AS sent_day, r.lead_id FROM rec r WHERE r.lead_id IS NOT NULL
    UNION
    SELECT r.id, (r.sent_at AT TIME ZONE 'America/Sao_Paulo')::date, ld.id FROM rec r JOIN lds ld ON ld.tail = r.tail
  ),
  closed AS (
    SELECT DISTINCT rl.id
    FROM rec_leads rl
    JOIN replied rp ON rp.id = rl.id
    JOIN public.company_events e ON e.lead_id = rl.lead_id
    WHERE e.company_id = p_company_id AND e.status <> 'cancelado'
      AND coalesce(e.data_fechamento_venda, (e.created_at AT TIME ZONE 'America/Sao_Paulo')::date) >= rl.sent_day
      AND coalesce(e.data_fechamento_venda, (e.created_at AT TIME ZONE 'America/Sao_Paulo')::date) <= rl.sent_day + 45
  )
  SELECT r.campaign_id, count(rp.id)::int AS replied, count(cl.id)::int AS closed
  FROM rec r
  LEFT JOIN replied rp ON rp.id = r.id
  LEFT JOIN closed cl ON cl.id = r.id
  GROUP BY r.campaign_id
$$;

REVOKE ALL ON FUNCTION public.campaign_results(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.campaign_results(uuid) TO authenticated;

-- 2) "Sair" na lista de quem não recebe mais campanhas
--    - Frases claras ("descadastrar", "me tire da lista", "não quero receber"):
--      valem em qualquer conversa, como antes.
--    - Palavras soltas que aparecem em outras conversas ("sair", "pare", "stop",
--      "parar", "remover", "não quero mais"): só se a pessoa recebeu campanha
--      nos últimos 30 dias (antes um "pare" em qualquer conversa bloqueava tudo).
CREATE OR REPLACE FUNCTION public.record_campaign_optout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_text text := lower(btrim(NEW.content));
  v_jid text;
  v_company uuid;
  v_digits text;
  v_strong boolean;
BEGIN
  IF v_text !~ '^(sair|parar|pare|stop|descadastrar|remover|me remova|me tire da lista|não quero mais|nao quero mais|não quero receber|nao quero receber)[ .!]*$' THEN
    RETURN NEW;
  END IF;
  v_strong := v_text ~ '^(descadastrar|me remova|me tire da lista|não quero receber|nao quero receber)[ .!]*$';
  SELECT w.remote_jid, w.company_id INTO v_jid, v_company
  FROM public.wapi_conversations w WHERE w.id = NEW.conversation_id;
  IF v_jid IS NULL OR v_jid LIKE '%@g.us' THEN
    RETURN NEW;
  END IF;
  v_digits := regexp_replace(split_part(v_jid, '@', 1), '\D', '', 'g');
  IF length(v_digits) < 8 THEN
    RETURN NEW;
  END IF;
  v_company := coalesce(NEW.company_id, v_company);
  IF NOT v_strong AND NOT EXISTS (
    SELECT 1 FROM public.campaign_recipients cr
    JOIN public.campaigns c ON c.id = cr.campaign_id
    WHERE c.company_id = v_company
      AND cr.status = 'sent'
      AND cr.sent_at > now() - interval '30 days'
      AND right(regexp_replace(cr.phone, '\D', '', 'g'), 8) = right(v_digits, 8)
  ) THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.campaign_optouts (company_id, phone, phone_tail)
  VALUES (v_company, v_digits, right(v_digits, 8))
  ON CONFLICT (company_id, phone_tail) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Nunca atrapalhar a gravação da mensagem
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.record_campaign_optout() FROM PUBLIC, anon, authenticated;
