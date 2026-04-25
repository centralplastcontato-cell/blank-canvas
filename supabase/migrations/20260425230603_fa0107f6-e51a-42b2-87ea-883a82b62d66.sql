DO $$
BEGIN
  LOCK TABLE public.notifications IN SHARE ROW EXCLUSIVE MODE;

  WITH ranked AS (
    SELECT
      id,
      row_number() OVER (
        PARTITION BY user_id, (data->>'lead_id')
        ORDER BY (CASE WHEN read THEN 1 ELSE 0 END) ASC, created_at DESC, id DESC
      ) AS rn
    FROM public.notifications
    WHERE type = 'stale_reminded'
      AND data ? 'lead_id'
      AND (data->>'lead_id') IS NOT NULL
  )
  DELETE FROM public.notifications n
  USING ranked r
  WHERE n.id = r.id AND r.rn > 1;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_stale_reminded_unique
  ON public.notifications (user_id, ((data->>'lead_id')))
  WHERE type = 'stale_reminded' AND (data->>'lead_id') IS NOT NULL;