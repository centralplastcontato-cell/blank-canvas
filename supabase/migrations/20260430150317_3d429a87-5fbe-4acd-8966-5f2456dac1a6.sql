-- Correção em lote: ajusta gross_amount das parcelas de cartão pagas
-- para que a soma dos brutos pagos cubra o total_value do evento,
-- eliminando alertas falsos de "parcela em atraso" em festas já quitadas.
--
-- Critério de seleção (conservador):
--   * O evento tem todas as parcelas com status = 'paid'
--   * O evento tem ao menos uma parcela paga no cartão
--   * Soma(gross_amount/amount) pago < total_value
--   * Diferença < 15% do total (taxa de cartão típica)
--
-- A diferença é distribuída proporcionalmente entre as parcelas de cartão pagas,
-- com base no amount líquido de cada uma.

WITH event_summary AS (
  SELECT 
    ep.event_id,
    ce.total_value,
    SUM(COALESCE(ep.gross_amount, ep.amount)) FILTER (WHERE ep.status='paid') AS soma_bruto_pago,
    SUM(ep.amount) FILTER (
      WHERE ep.status='paid' AND ep.payment_method IN ('cartao','cartao_credito')
    ) AS soma_cartao_liquido
  FROM event_payments ep
  JOIN company_events ce ON ce.id = ep.event_id
  WHERE ce.total_value IS NOT NULL AND ce.total_value > 0
  GROUP BY ep.event_id, ce.total_value
  HAVING 
    COUNT(*) = COUNT(*) FILTER (WHERE ep.status='paid')
    AND COUNT(*) FILTER (WHERE ep.payment_method IN ('cartao','cartao_credito') AND ep.status='paid') > 0
    AND SUM(COALESCE(ep.gross_amount, ep.amount)) FILTER (WHERE ep.status='paid') < ce.total_value - 0.5
    AND (ce.total_value - SUM(COALESCE(ep.gross_amount, ep.amount)) FILTER (WHERE ep.status='paid')) < ce.total_value * 0.15
),
adjustments AS (
  SELECT 
    ep.id,
    ROUND(
      COALESCE(ep.gross_amount, ep.amount) 
      + (es.total_value - es.soma_bruto_pago) * (ep.amount / NULLIF(es.soma_cartao_liquido, 0)),
      2
    ) AS new_gross
  FROM event_payments ep
  JOIN event_summary es ON es.event_id = ep.event_id
  WHERE ep.status = 'paid'
    AND ep.payment_method IN ('cartao','cartao_credito')
)
UPDATE event_payments ep
SET gross_amount = a.new_gross,
    updated_at = now()
FROM adjustments a
WHERE ep.id = a.id;