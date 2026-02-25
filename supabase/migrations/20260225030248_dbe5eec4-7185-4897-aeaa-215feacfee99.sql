
-- Create ai_usage_logs table
CREATE TABLE public.ai_usage_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  function_name text NOT NULL,
  model text NOT NULL DEFAULT 'gpt-4o-mini',
  prompt_tokens integer DEFAULT 0,
  completion_tokens integer DEFAULT 0,
  total_tokens integer DEFAULT 0,
  estimated_cost_usd numeric(10, 8) DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for querying by company and date
CREATE INDEX idx_ai_usage_logs_company_created ON public.ai_usage_logs (company_id, created_at DESC);
CREATE INDEX idx_ai_usage_logs_function ON public.ai_usage_logs (function_name);

-- Enable RLS
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Only global admins can read
CREATE POLICY "Global admins can view ai usage logs"
ON public.ai_usage_logs
FOR SELECT
USING (is_admin(auth.uid()));

-- Service role can insert (edge functions use service role key)
CREATE POLICY "Service can insert ai usage logs"
ON public.ai_usage_logs
FOR INSERT
WITH CHECK (true);
