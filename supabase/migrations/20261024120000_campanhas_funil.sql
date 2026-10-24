-- Campanhas, etapa 4 (24/10): funil de cada campanha, por mensagem (variação).
-- Para cada campanha e variação: enviadas, responderam (até 3 dias, sem contar
-- "sair"), marcaram visita (quem respondeu e teve visita criada em até 30
-- dias) e fecharam festa (quem respondeu e fechou em até 45 dias).
-- Mesmas regras do campaign_results, que continua existindo.
CREATE OR REPLACE FUNCTION public.campaign_funnel(p_company_id uuid)
RETURNS TABLE (campaign_id uuid, variation_index integer, sent integer, replied integer, visited integer, closed integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ok AS (
    SELECT (public.is_admin(auth.uid()) OR public.user_has_company_access(auth.uid(), p_company_id)) AS allowed
  ),
  rec AS (
    SELECT cr.id, cr.campaign_id, cr.variation_index, cr.lead_id, cr.sent_at,
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
    SELECT r.id, r.sent_at, (r.sent_at AT TIME ZONE 'America/Sao_Paulo')::date AS sent_day, r.lead_id FROM rec r WHERE r.lead_id IS NOT NULL
    UNION
    SELECT r.id, r.sent_at, (r.sent_at AT TIME ZONE 'America/Sao_Paulo')::date, ld.id FROM rec r JOIN lds ld ON ld.tail = r.tail
  ),
  visited AS (
    SELECT DISTINCT rl.id
    FROM rec_leads rl
    JOIN replied rp ON rp.id = rl.id
    JOIN public.lead_visits v ON v.lead_id = rl.lead_id
    WHERE v.company_id = p_company_id
      AND v.created_at >= rl.sent_at AND v.created_at < rl.sent_at + interval '30 days'
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
  SELECT r.campaign_id, coalesce(r.variation_index, 0)::int,
         count(*)::int AS sent,
         count(rp.id)::int AS replied,
         count(vi.id)::int AS visited,
         count(cl.id)::int AS closed
  FROM rec r
  LEFT JOIN replied rp ON rp.id = r.id
  LEFT JOIN visited vi ON vi.id = r.id
  LEFT JOIN closed cl ON cl.id = r.id
  GROUP BY r.campaign_id, coalesce(r.variation_index, 0)
$$;

REVOKE ALL ON FUNCTION public.campaign_funnel(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.campaign_funnel(uuid) TO authenticated;
