-- Painel do Hub: todas as contas em uma única chamada no banco.
-- Antes o navegador baixava todos os leads e conversas e fazia várias contagens
-- separadas; a contagem de mensagens enviadas estourava o limite de 8s e voltava 0.

-- Índices para as contagens por empresa + período
CREATE INDEX IF NOT EXISTS idx_wapi_messages_company_created
  ON public.wapi_messages (company_id, created_at);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_company_created
  ON public.campaign_leads (company_id, created_at);
CREATE INDEX IF NOT EXISTS idx_wapi_conversations_company_created
  ON public.wapi_conversations (company_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.hub_dashboard_metrics(
  p_from timestamptz,
  p_to timestamptz,
  p_today_start timestamptz,
  p_company_id uuid DEFAULT NULL,
  p_status text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH allowed AS (
  -- Mesmas regras de acesso das tabelas (RLS): admin vê tudo, os demais só as suas empresas
  SELECT c.id, c.name, c.logo_url, c.parent_id
  FROM companies c
  WHERE public.is_admin(auth.uid()) OR c.id = ANY (public.get_user_company_ids(auth.uid()))
),
scope_all AS (
  -- Unidades (filhas) quando existem; senão, todas
  SELECT * FROM allowed WHERE parent_id IS NOT NULL
  UNION ALL
  SELECT * FROM allowed WHERE NOT EXISTS (SELECT 1 FROM allowed WHERE parent_id IS NOT NULL)
),
scope AS (
  SELECT * FROM scope_all WHERE p_company_id IS NULL OR id = p_company_id
),
bounds AS (
  SELECT p_from - (p_to - p_from) AS prev_from
),
leads AS (
  -- Período atual + anterior (para a comparação)
  SELECT l.company_id, l.status::text AS status, l.created_at
  FROM campaign_leads l, bounds b
  WHERE l.company_id IN (SELECT id FROM scope)
    AND l.created_at >= b.prev_from AND l.created_at <= p_to
    AND (p_status IS NULL OR l.status::text = p_status)
),
cur_leads AS (
  SELECT * FROM leads WHERE created_at >= p_from
),
lead_stats AS (
  SELECT company_id,
    count(*) AS leads,
    count(*) FILTER (WHERE created_at >= p_today_start) AS leads_today,
    count(*) FILTER (WHERE status = 'novo') AS leads_new,
    count(*) FILTER (WHERE status = 'perdido') AS leads_lost,
    max(created_at) AS last_lead_at
  FROM cur_leads GROUP BY company_id
),
closed AS (
  -- Festas fechadas pela data de fechamento da venda
  SELECT e.company_id,
    count(*) FILTER (WHERE e.data_fechamento_venda >= p_from::date AND e.data_fechamento_venda <= p_to::date) AS closed,
    count(*) FILTER (WHERE e.data_fechamento_venda < p_from::date) AS closed_prev
  FROM company_events e, bounds b
  WHERE e.company_id IN (SELECT id FROM scope)
    AND e.data_fechamento_venda >= b.prev_from::date AND e.data_fechamento_venda <= p_to::date
  GROUP BY e.company_id
),
convos AS (
  SELECT company_id,
    count(*) AS conversations,
    count(*) FILTER (WHERE NOT coalesce(is_closed, false)) AS active_conversations
  FROM wapi_conversations
  WHERE company_id IN (SELECT id FROM scope) AND created_at >= p_from AND created_at <= p_to
  GROUP BY company_id
),
follow_ups AS (
  SELECT company_id, count(*) AS follow_ups
  FROM lead_history
  WHERE company_id IN (SELECT id FROM scope) AND action ILIKE 'Follow-up%'
    AND created_at >= p_from AND created_at <= p_to
  GROUP BY company_id
),
msgs AS (
  SELECT company_id,
    count(*) FILTER (WHERE from_me) AS msgs_sent,
    count(*) FILTER (WHERE NOT from_me) AS msgs_received
  FROM wapi_messages
  WHERE company_id IN (SELECT id FROM scope) AND created_at >= p_from AND created_at <= p_to
  GROUP BY company_id
),
recent_convos AS (
  -- 1ª resposta da equipe: até 100 conversas mais recentes do período por empresa
  SELECT id, company_id, created_at FROM (
    SELECT c.id, c.company_id, c.created_at,
      row_number() OVER (PARTITION BY c.company_id ORDER BY c.created_at DESC) AS rn
    FROM wapi_conversations c
    WHERE c.company_id IN (SELECT id FROM scope) AND c.created_at >= p_from AND c.created_at <= p_to
  ) x WHERE rn <= 100
),
responses AS (
  SELECT rc.company_id, extract(epoch FROM (fm.ts - rc.created_at)) / 60 AS minutes
  FROM recent_convos rc
  CROSS JOIN LATERAL (
    -- Só mensagens da equipe: enviadas pela plataforma ou pelo celular (robô, IA e lembretes ficam de fora)
    SELECT min(m.timestamp) AS ts FROM wapi_messages m
    WHERE m.conversation_id = rc.id AND m.from_me
      AND m.metadata->>'source' IN ('platform', 'phone')
  ) fm
  WHERE fm.ts IS NOT NULL
    AND fm.ts >= rc.created_at
    AND fm.ts < rc.created_at + interval '30 days'
),
response_stats AS (
  SELECT company_id,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY minutes) AS median_minutes,
    count(*) AS samples
  FROM responses GROUP BY company_id
),
instances AS (
  SELECT DISTINCT ON (company_id) company_id, status, phone_number
  FROM wapi_instances
  WHERE company_id IN (SELECT id FROM scope)
  ORDER BY company_id, connected_at DESC NULLS LAST
)
SELECT jsonb_build_object(
  'companies_all', coalesce((
    SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name) ORDER BY name) FROM scope_all
  ), '[]'::jsonb),
  'companies', coalesce((
    SELECT jsonb_agg(jsonb_build_object(
      'id', s.id,
      'name', s.name,
      'logo_url', s.logo_url,
      'whatsapp_status', CASE
        WHEN i.status IN ('open', 'connected') THEN 'connected'
        WHEN i.company_id IS NOT NULL THEN 'disconnected'
        ELSE 'unknown' END,
      'whatsapp_phone', i.phone_number,
      'leads', coalesce(ls.leads, 0),
      'leads_today', coalesce(ls.leads_today, 0),
      'leads_new', coalesce(ls.leads_new, 0),
      'leads_lost', coalesce(ls.leads_lost, 0),
      'last_lead_at', ls.last_lead_at,
      'closed', coalesce(cl.closed, 0),
      'conversations', coalesce(cv.conversations, 0),
      'active_conversations', coalesce(cv.active_conversations, 0),
      'follow_ups', coalesce(fu.follow_ups, 0),
      'msgs_sent', coalesce(ms.msgs_sent, 0),
      'msgs_received', coalesce(ms.msgs_received, 0),
      'response_median_minutes', rs.median_minutes,
      'response_samples', coalesce(rs.samples, 0)
    ) ORDER BY s.name)
    FROM scope s
    LEFT JOIN lead_stats ls ON ls.company_id = s.id
    LEFT JOIN closed cl ON cl.company_id = s.id
    LEFT JOIN convos cv ON cv.company_id = s.id
    LEFT JOIN follow_ups fu ON fu.company_id = s.id
    LEFT JOIN msgs ms ON ms.company_id = s.id
    LEFT JOIN response_stats rs ON rs.company_id = s.id
    LEFT JOIN instances i ON i.company_id = s.id
  ), '[]'::jsonb),
  'previous', jsonb_build_object(
    'leads', (SELECT count(*) FROM leads WHERE created_at < p_from),
    'closed', (SELECT coalesce(sum(closed_prev), 0) FROM closed)
  ),
  'response', jsonb_build_object(
    'median_minutes', (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY minutes) FROM responses),
    'samples', (SELECT count(*) FROM responses)
  ),
  'lead_buckets', coalesce((
    SELECT jsonb_agg(jsonb_build_object('company_id', company_id, 'month', month, 'status', status, 'count', n))
    FROM (
      SELECT company_id, to_char(created_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM') AS month, status, count(*) AS n
      FROM cur_leads GROUP BY 1, 2, 3
    ) b
  ), '[]'::jsonb)
)
$$;

REVOKE ALL ON FUNCTION public.hub_dashboard_metrics(timestamptz, timestamptz, timestamptz, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hub_dashboard_metrics(timestamptz, timestamptz, timestamptz, uuid, text) TO authenticated;
