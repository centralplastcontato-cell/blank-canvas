-- Campanhas, parte 2: resultado de cada campanha e lista de quem pediu para sair.

-- 1) Resultado: quem respondeu em até 3 dias e quem fechou festa em até 45 dias
--    depois de receber. Compara pelo telefone (últimos 8 dígitos), para contar
--    também os contatos da Base de leads, que não têm lead ligado.
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
    )
  ),
  rec_leads AS (
    SELECT r.id, (r.sent_at AT TIME ZONE 'America/Sao_Paulo')::date AS sent_day, r.lead_id FROM rec r WHERE r.lead_id IS NOT NULL
    UNION
    SELECT r.id, (r.sent_at AT TIME ZONE 'America/Sao_Paulo')::date, ld.id FROM rec r JOIN lds ld ON ld.tail = r.tail
  ),
  -- Data da venda é só o dia: compara por dia, no horário de Brasília
  closed AS (
    SELECT DISTINCT rl.id
    FROM rec_leads rl
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

-- 2) Quem pediu para sair: o cliente que manda só "sair", "parar"... não recebe
--    mais campanhas daquela empresa. Só grava; não responde nada nem mexe no robô.
CREATE TABLE IF NOT EXISTS public.campaign_optouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  phone text NOT NULL,
  phone_tail text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, phone_tail)
);

ALTER TABLE public.campaign_optouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view campaign optouts for their companies" ON public.campaign_optouts;
CREATE POLICY "Users can view campaign optouts for their companies"
  ON public.campaign_optouts FOR SELECT TO authenticated
  USING (company_id IN (SELECT unnest(public.get_user_company_ids(auth.uid()))));

-- Quem já está na lista e quer voltar a receber: a equipe tira pela tela
DROP POLICY IF EXISTS "Users can delete campaign optouts for their companies" ON public.campaign_optouts;
CREATE POLICY "Users can delete campaign optouts for their companies"
  ON public.campaign_optouts FOR DELETE TO authenticated
  USING (company_id IN (SELECT unnest(public.get_user_company_ids(auth.uid()))));

CREATE OR REPLACE FUNCTION public.record_campaign_optout()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_jid text;
  v_company uuid;
  v_digits text;
BEGIN
  IF lower(btrim(NEW.content)) !~ '^(sair|parar|pare|stop|descadastrar|remover|me remova|me tire da lista|não quero mais|nao quero mais|não quero receber|nao quero receber)[ .!]*$' THEN
    RETURN NEW;
  END IF;
  SELECT w.remote_jid, w.company_id INTO v_jid, v_company
  FROM public.wapi_conversations w WHERE w.id = NEW.conversation_id;
  IF v_jid IS NULL OR v_jid LIKE '%@g.us' THEN
    RETURN NEW;
  END IF;
  v_digits := regexp_replace(split_part(v_jid, '@', 1), '\D', '', 'g');
  IF length(v_digits) < 8 THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.campaign_optouts (company_id, phone, phone_tail)
  VALUES (coalesce(NEW.company_id, v_company), v_digits, right(v_digits, 8))
  ON CONFLICT (company_id, phone_tail) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Nunca atrapalhar a gravação da mensagem
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.record_campaign_optout() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_campaign_optout ON public.wapi_messages;
CREATE TRIGGER trg_campaign_optout
  AFTER INSERT ON public.wapi_messages
  FOR EACH ROW
  WHEN (NEW.from_me = false AND NEW.content IS NOT NULL AND length(NEW.content) <= 40)
  EXECUTE FUNCTION public.record_campaign_optout();

-- 3) Faltava a regra que deixa apagar. Sem ela o banco ignorava o "apagar" em silêncio:
--    - "Editar destinatários" não tirava os pendentes antigos e somava os novos
--      (a mesma pessoa podia receber duas vezes);
--    - apagar imagem da galeria dizia "apagada", mas ela continuava lá.
DROP POLICY IF EXISTS "Users can delete campaign_recipients via campaign" ON public.campaign_recipients;
CREATE POLICY "Users can delete campaign_recipients via campaign"
  ON public.campaign_recipients FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.campaigns c
    WHERE c.id = campaign_recipients.campaign_id
      AND public.user_has_company_access(auth.uid(), c.company_id)
  ));

DROP POLICY IF EXISTS "Users can delete images from their companies" ON public.campaign_images;
CREATE POLICY "Users can delete images from their companies"
  ON public.campaign_images FOR DELETE TO authenticated
  USING (public.user_has_company_access(auth.uid(), company_id));
