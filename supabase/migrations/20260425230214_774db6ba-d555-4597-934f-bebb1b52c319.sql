DO $$
BEGIN
  -- Lock para evitar inserts concorrentes da edge function durante a operação
  LOCK TABLE public.lead_history IN SHARE ROW EXCLUSIVE MODE;

  -- Dedup final
  WITH ranked_h AS (
    SELECT
      id,
      row_number() OVER (
        PARTITION BY lead_id, action
        ORDER BY created_at ASC, id ASC
      ) AS rn
    FROM public.lead_history
    WHERE action = 'alerta_reminded_2h'
  )
  DELETE FROM public.lead_history h
  USING ranked_h r
  WHERE h.id = r.id AND r.rn > 1;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_history_alerta_reminded_unique
  ON public.lead_history (lead_id, action)
  WHERE action = 'alerta_reminded_2h';