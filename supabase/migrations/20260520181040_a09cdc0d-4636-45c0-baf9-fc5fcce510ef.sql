ALTER TABLE public.company_events
  ADD COLUMN IF NOT EXISTS payment_blocks jsonb;

COMMENT ON COLUMN public.company_events.payment_blocks IS
  'Array de blocos de pagamento (forma + valor + parcelas). Substitui Entrada+Saldo de payment_details, mantendo compatibilidade.';

-- Backfill a partir de payment_details (entrada_* / saldo_*)
UPDATE public.company_events ce
SET payment_blocks = sub.blocks
FROM (
  SELECT
    e.id,
    (
      SELECT jsonb_agg(b ORDER BY ord)
      FROM (
        SELECT 1 AS ord, jsonb_build_object(
          'id', gen_random_uuid()::text,
          'label', 'Entrada',
          'valor', COALESCE((e.payment_details->>'entrada_valor')::numeric, 0),
          'forma', COALESCE(NULLIF(e.payment_details->>'entrada_forma',''), 'dinheiro'),
          'parcelas', COALESCE((e.payment_details->>'entrada_parcelas')::int, 1),
          'card_installments',
            CASE
              WHEN e.payment_details->>'entrada_forma' IN ('cartao','cartao_credito')
                THEN COALESCE((e.payment_details->>'entrada_parcelas')::int, 1)
              WHEN e.payment_details->>'entrada_forma' = 'cartao_debito' THEN 1
              ELSE NULL
            END
        ) AS b
        WHERE COALESCE((e.payment_details->>'entrada_valor')::numeric, 0) > 0

        UNION ALL

        SELECT 2 AS ord, jsonb_build_object(
          'id', gen_random_uuid()::text,
          'label', 'Saldo',
          'valor', COALESCE((e.payment_details->>'saldo_valor')::numeric, 0),
          'forma', COALESCE(NULLIF(e.payment_details->>'saldo_forma',''), 'dinheiro'),
          'parcelas', COALESCE((e.payment_details->>'parcelas')::int, 1),
          'parcelas_details', e.payment_details->'parcelas_details',
          'card_installments',
            CASE
              WHEN e.payment_details->>'saldo_forma' IN ('cartao','cartao_credito')
                THEN COALESCE((e.payment_details->>'parcelas')::int, 1)
              WHEN e.payment_details->>'saldo_forma' = 'cartao_debito' THEN 1
              ELSE NULL
            END
        ) AS b
        WHERE COALESCE((e.payment_details->>'saldo_valor')::numeric, 0) > 0
      ) blocos
    ) AS blocks
  FROM public.company_events e
  WHERE e.payment_blocks IS NULL
    AND e.payment_details IS NOT NULL
    AND (
      COALESCE((e.payment_details->>'entrada_valor')::numeric, 0) > 0
      OR COALESCE((e.payment_details->>'saldo_valor')::numeric, 0) > 0
    )
) sub
WHERE ce.id = sub.id
  AND sub.blocks IS NOT NULL;