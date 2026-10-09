-- Campanhas, parte 3: envio pelo servidor.
-- A campanha sai sozinha (sem deixar a tela aberta), até 30 por dia por empresa,
-- de segunda a sábado das 9h às 19h, uma a cada ~20 min com tempo variado.
-- Quem decide o horário e o intervalo é a edge function campaign-dispatch; aqui
-- fica a parte que precisa ser à prova de duas execuções ao mesmo tempo.

-- 1) Como a campanha foi mandada para a fila
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS server_send boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS send_mode text,
  ADD COLUMN IF NOT EXISTS send_instance_id text,
  ADD COLUMN IF NOT EXISTS last_error text;

-- Quando o servidor pegou a pessoa para enviar (para não mandar duas vezes se algo cair no meio)
ALTER TABLE public.campaign_recipients
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

-- 2) Ritmo de cada empresa: quando pode sair a próxima mensagem
CREATE TABLE IF NOT EXISTS public.campaign_dispatch_state (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  next_send_at timestamptz NOT NULL DEFAULT now(),
  last_sent_at timestamptz,
  consecutive_errors integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.campaign_dispatch_state ENABLE ROW LEVEL SECURITY;

-- A tela só lê (para mostrar "próxima mensagem às 14:32"); quem grava é o servidor
DROP POLICY IF EXISTS "Users can view dispatch state of their companies" ON public.campaign_dispatch_state;
CREATE POLICY "Users can view dispatch state of their companies"
  ON public.campaign_dispatch_state FOR SELECT TO authenticated
  USING (public.user_has_company_access(auth.uid(), company_id));

-- 3) Recalcula os contadores da campanha a partir das pessoas
CREATE OR REPLACE FUNCTION public.campaign_refresh_counts(p_campaign_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.campaigns c SET
    sent_count = (SELECT count(*) FROM public.campaign_recipients r WHERE r.campaign_id = c.id AND r.status = 'sent'),
    error_count = (SELECT count(*) FROM public.campaign_recipients r WHERE r.campaign_id = c.id AND r.status = 'error')
  WHERE c.id = p_campaign_id
$$;

-- 4) Pega a próxima pessoa de cada empresa que está na vez.
--    Uma linha por empresa: com recipient_id = a pessoa a enviar (já marcada como
--    'sending'), ou recipient_id nulo quando o limite do dia já bateu.
--    Telefone inválido, quem pediu para sair e repetidos viram erro e não são enviados.
CREATE OR REPLACE FUNCTION public.campaign_dispatch_claim(
  p_daily_limit integer,
  p_day_start timestamptz,
  p_lock_minutes integer
)
RETURNS TABLE (
  company_id uuid,
  campaign_id uuid,
  recipient_id uuid,
  phone text,
  lead_name text,
  variation_index integer,
  sent_today integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_stuck uuid[];
  v_company uuid;
  v_rec record;
  v_sent_today integer;
  v_tail text;
  v_error text;
BEGIN
  -- Quem ficou "enviando" há mais de 30 min (o servidor caiu no meio): não sabemos se
  -- saiu, então não manda de novo
  WITH stuck AS (
    UPDATE public.campaign_recipients r
       SET status = 'error', error_message = 'Envio não confirmado (o servidor parou no meio)'
     WHERE r.status = 'sending' AND r.claimed_at IS NOT NULL AND r.claimed_at < now() - interval '30 minutes'
     RETURNING r.campaign_id
  )
  SELECT array_agg(DISTINCT s.campaign_id) INTO v_stuck FROM stuck s;
  IF v_stuck IS NOT NULL THEN
    PERFORM public.campaign_refresh_counts(x) FROM unnest(v_stuck) AS x;
  END IF;

  FOR v_company IN
    SELECT DISTINCT c.company_id FROM public.campaigns c WHERE c.status = 'sending' AND c.server_send
  LOOP
    INSERT INTO public.campaign_dispatch_state (company_id) VALUES (v_company) ON CONFLICT DO NOTHING;

    -- Só uma execução por empresa por vez, e só quando chegou a hora
    PERFORM 1 FROM public.campaign_dispatch_state s
     WHERE s.company_id = v_company AND s.next_send_at <= now()
     FOR UPDATE SKIP LOCKED;
    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    -- Campanha que não tem mais ninguém pendente: concluída
    UPDATE public.campaigns c
       SET status = 'completed', completed_at = now(), last_error = NULL
     WHERE c.company_id = v_company AND c.status = 'sending' AND c.server_send
       AND NOT EXISTS (
         SELECT 1 FROM public.campaign_recipients r
          WHERE r.campaign_id = c.id AND r.status IN ('pending', 'sending')
       );

    -- Limite do dia (conta tudo que a empresa mandou hoje, de qualquer campanha)
    SELECT count(*) INTO v_sent_today
      FROM public.campaign_recipients r
      JOIN public.campaigns c ON c.id = r.campaign_id
     WHERE c.company_id = v_company AND r.status = 'sent' AND r.sent_at >= p_day_start;
    IF v_sent_today >= p_daily_limit THEN
      company_id := v_company; campaign_id := NULL; recipient_id := NULL;
      phone := NULL; lead_name := NULL; variation_index := NULL; sent_today := v_sent_today;
      RETURN NEXT;
      CONTINUE;
    END IF;

    LOOP
      -- A campanha que começou primeiro vai primeiro
      SELECT r.id, r.campaign_id, r.phone, r.lead_name, r.variation_index
        INTO v_rec
        FROM public.campaign_recipients r
        JOIN public.campaigns c ON c.id = r.campaign_id
       WHERE c.company_id = v_company AND c.status = 'sending' AND c.server_send AND r.status = 'pending'
       ORDER BY c.started_at NULLS LAST, c.created_at, r.created_at, r.id
       LIMIT 1
       FOR UPDATE OF r SKIP LOCKED;
      EXIT WHEN NOT FOUND;

      v_tail := right(regexp_replace(coalesce(v_rec.phone, ''), '\D', '', 'g'), 8);
      v_error := NULL;
      IF length(v_tail) < 8 THEN
        v_error := 'Telefone inválido';
      ELSIF EXISTS (
        SELECT 1 FROM public.campaign_optouts o WHERE o.company_id = v_company AND o.phone_tail = v_tail
      ) THEN
        v_error := 'Pediu para não receber campanhas';
      ELSIF EXISTS (
        SELECT 1 FROM public.campaign_recipients r2
         WHERE r2.campaign_id = v_rec.campaign_id AND r2.id <> v_rec.id
           AND r2.status IN ('sent', 'sending')
           AND right(regexp_replace(r2.phone, '\D', '', 'g'), 8) = v_tail
      ) THEN
        v_error := 'Telefone repetido: já recebeu esta campanha';
      END IF;

      IF v_error IS NOT NULL THEN
        UPDATE public.campaign_recipients SET status = 'error', error_message = v_error WHERE id = v_rec.id;
        PERFORM public.campaign_refresh_counts(v_rec.campaign_id);
        CONTINUE;
      END IF;

      -- Separa esta pessoa e segura a empresa enquanto a mensagem sai
      UPDATE public.campaign_recipients SET status = 'sending', claimed_at = now() WHERE id = v_rec.id;
      UPDATE public.campaign_dispatch_state
         SET next_send_at = now() + make_interval(mins => p_lock_minutes), updated_at = now()
       WHERE campaign_dispatch_state.company_id = v_company;

      company_id := v_company; campaign_id := v_rec.campaign_id; recipient_id := v_rec.id;
      phone := v_rec.phone; lead_name := v_rec.lead_name; variation_index := v_rec.variation_index;
      sent_today := v_sent_today;
      RETURN NEXT;
      EXIT;
    END LOOP;
  END LOOP;
END;
$$;

-- Só o servidor (chave de serviço) chama estas funções
REVOKE ALL ON FUNCTION public.campaign_refresh_counts(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.campaign_dispatch_claim(integer, timestamptz, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.campaign_refresh_counts(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.campaign_dispatch_claim(integer, timestamptz, integer) TO service_role;

-- 5) Agendamento: a cada 2 minutos, de segunda a sábado entre 12h e 21h59 UTC
--    (9h às 18h59 em Brasília). A função confere o horário de novo e só manda o que
--    está na vez, então chamar a mais não manda mensagem a mais. Não precisa de chave.
--    Espera até 60 s pela resposta (o padrão de 5 s é curto para um envio de WhatsApp).
SELECT cron.unschedule('campaign-dispatch-every-2min')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'campaign-dispatch-every-2min');

SELECT cron.schedule(
  'campaign-dispatch-every-2min',
  '*/2 12-21 * * 1-6',
  $cron$
  SELECT net.http_post(
    url := 'https://rsezgnkfhodltrsewlhz.supabase.co/functions/v1/campaign-dispatch',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) AS request_id;
  $cron$
);
