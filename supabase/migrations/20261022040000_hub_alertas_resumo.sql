-- Hub: central de alertas e resumo da semana por IA.

-- Saúde de cada unidade (independe dos filtros do Painel): base dos alertas.
CREATE OR REPLACE FUNCTION public.hub_health()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH allowed AS (
  -- Mesmas regras de acesso das tabelas (RLS): admin vê tudo, os demais só as suas empresas
  SELECT c.id, c.name, c.parent_id
  FROM companies c
  WHERE public.is_admin(auth.uid()) OR c.id = ANY (public.get_user_company_ids(auth.uid()))
),
scope AS (
  -- Unidades (filhas) quando existem; senão, todas
  SELECT * FROM allowed WHERE parent_id IS NOT NULL
  UNION ALL
  SELECT * FROM allowed WHERE NOT EXISTS (SELECT 1 FROM allowed WHERE parent_id IS NOT NULL)
),
last_leads AS (
  SELECT company_id, max(created_at) AS last_lead_at
  FROM campaign_leads WHERE company_id IN (SELECT id FROM scope)
  GROUP BY company_id
),
lead_weeks AS (
  SELECT company_id,
    count(*) FILTER (WHERE created_at >= now() - interval '7 days') AS leads_7d,
    count(*) FILTER (WHERE created_at < now() - interval '7 days' AND created_at >= now() - interval '14 days') AS leads_prev_7d,
    count(*) AS leads_30d
  FROM campaign_leads
  WHERE company_id IN (SELECT id FROM scope) AND created_at >= now() - interval '30 days'
  GROUP BY company_id
),
recent_convos AS (
  -- 1ª resposta da equipe nos últimos 7 dias (até 100 conversas por empresa)
  SELECT id, company_id, created_at FROM (
    SELECT c.id, c.company_id, c.created_at,
      row_number() OVER (PARTITION BY c.company_id ORDER BY c.created_at DESC) AS rn
    FROM wapi_conversations c
    WHERE c.company_id IN (SELECT id FROM scope) AND c.created_at >= now() - interval '7 days'
  ) x WHERE rn <= 100
),
responses AS (
  SELECT rc.company_id, extract(epoch FROM (fm.ts - rc.created_at)) / 60 AS minutes
  FROM recent_convos rc
  CROSS JOIN LATERAL (
    SELECT min(m.timestamp) AS ts FROM wapi_messages m
    WHERE m.conversation_id = rc.id AND m.from_me
      AND m.metadata->>'source' IN ('platform', 'phone')
  ) fm
  WHERE fm.ts IS NOT NULL AND fm.ts >= rc.created_at AND fm.ts < rc.created_at + interval '30 days'
),
response_stats AS (
  SELECT company_id,
    percentile_cont(0.5) WITHIN GROUP (ORDER BY minutes) AS median_minutes,
    count(*) AS samples
  FROM responses GROUP BY company_id
),
waiting AS (
  -- Cliente mandou a última mensagem há mais de 2h (e menos de 7 dias), lead ainda em aberto
  SELECT w.company_id, count(*) AS waiting, min(w.last_message_at) AS oldest_waiting_at
  FROM wapi_conversations w
  JOIN campaign_leads l ON l.id = w.lead_id
  WHERE w.company_id IN (SELECT id FROM scope)
    AND NOT coalesce(w.is_closed, false)
    AND w.last_message_from_me = false
    AND w.last_message_at < now() - interval '2 hours'
    AND w.last_message_at > now() - interval '7 days'
    AND l.status::text IN ('novo', 'em_contato', 'orcamento_enviado', 'aguardando_resposta', 'cliente_retorno')
  GROUP BY w.company_id
),
instances AS (
  SELECT DISTINCT ON (company_id) company_id, status
  FROM wapi_instances
  WHERE company_id IN (SELECT id FROM scope)
  ORDER BY company_id, connected_at DESC NULLS LAST
)
SELECT coalesce(jsonb_agg(jsonb_build_object(
  'id', s.id,
  'name', s.name,
  'whatsapp_status', CASE
    WHEN i.status IN ('open', 'connected') THEN 'connected'
    WHEN i.company_id IS NOT NULL THEN 'disconnected'
    ELSE 'unknown' END,
  'last_lead_at', ll.last_lead_at,
  'leads_7d', coalesce(lw.leads_7d, 0),
  'leads_prev_7d', coalesce(lw.leads_prev_7d, 0),
  'leads_30d', coalesce(lw.leads_30d, 0),
  'response_median_minutes', rs.median_minutes,
  'response_samples', coalesce(rs.samples, 0),
  'waiting', coalesce(wt.waiting, 0),
  'oldest_waiting_at', wt.oldest_waiting_at
) ORDER BY s.name), '[]'::jsonb)
FROM scope s
LEFT JOIN last_leads ll ON ll.company_id = s.id
LEFT JOIN lead_weeks lw ON lw.company_id = s.id
LEFT JOIN response_stats rs ON rs.company_id = s.id
LEFT JOIN waiting wt ON wt.company_id = s.id
LEFT JOIN instances i ON i.company_id = s.id
$$;

REVOKE ALL ON FUNCTION public.hub_health() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.hub_health() TO authenticated;

-- Resumos da semana escritos pela IA (gerados pela função hub-weekly-summary)
CREATE TABLE IF NOT EXISTS public.hub_weekly_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  period_from timestamptz NOT NULL,
  period_to timestamptz NOT NULL,
  content text NOT NULL,
  facts jsonb,
  model text
);

ALTER TABLE public.hub_weekly_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read hub summaries" ON public.hub_weekly_summaries;
CREATE POLICY "Admins read hub summaries" ON public.hub_weekly_summaries
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
-- Gravação só pela função (service role), que confere se quem pediu é admin.
