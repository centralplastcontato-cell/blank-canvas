
ALTER TABLE public.lead_intelligence
ADD COLUMN ai_summary text,
ADD COLUMN ai_next_action text,
ADD COLUMN ai_summary_at timestamp with time zone;
