-- Delete duplicates keeping only the earliest record per lead+stage
DELETE FROM public.lead_reactivation_history
WHERE id NOT IN (
  SELECT DISTINCT ON (lead_id, reactivation_stage) id
  FROM public.lead_reactivation_history
  ORDER BY lead_id, reactivation_stage, created_at ASC
);

-- Add unique constraint to prevent duplicate sends
ALTER TABLE public.lead_reactivation_history
  ADD CONSTRAINT uq_reactivation_lead_stage UNIQUE (lead_id, reactivation_stage);