
-- Create daily_summaries table for historical persistence
CREATE TABLE public.daily_summaries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  summary_date date NOT NULL,
  metrics jsonb,
  ai_summary text,
  timeline jsonb,
  incomplete_leads jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(company_id, summary_date)
);

-- Enable RLS
ALTER TABLE public.daily_summaries ENABLE ROW LEVEL SECURITY;

-- Users can view summaries from their companies
CREATE POLICY "Users can view daily summaries from their companies"
ON public.daily_summaries FOR SELECT
USING (company_id = ANY(get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

-- Edge function (service role) can insert/update summaries
CREATE POLICY "Service can upsert daily summaries"
ON public.daily_summaries FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service can update daily summaries"
ON public.daily_summaries FOR UPDATE
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_daily_summaries_updated_at
BEFORE UPDATE ON public.daily_summaries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
