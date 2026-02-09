-- Add new columns for Hub prospect qualification
ALTER TABLE public.b2b_leads 
  ADD COLUMN IF NOT EXISTS instagram text,
  ADD COLUMN IF NOT EXISTS monthly_leads text,
  ADD COLUMN IF NOT EXISTS lead_cost text,
  ADD COLUMN IF NOT EXISTS has_lead_clarity boolean,
  ADD COLUMN IF NOT EXISTS lead_organization text,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'b2b';

-- Add index for filtering by source
CREATE INDEX IF NOT EXISTS idx_b2b_leads_source ON public.b2b_leads(source);
