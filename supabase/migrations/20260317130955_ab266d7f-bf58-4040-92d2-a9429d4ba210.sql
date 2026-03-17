
-- Add qualification columns to lead_visits table
ALTER TABLE public.lead_visits
  ADD COLUMN IF NOT EXISTS package_interest text,
  ADD COLUMN IF NOT EXISTS guest_count integer,
  ADD COLUMN IF NOT EXISTS party_date_interest date,
  ADD COLUMN IF NOT EXISTS payment_preference text,
  ADD COLUMN IF NOT EXISTS interest_level text,
  ADD COLUMN IF NOT EXISTS restrictions jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS client_questions text,
  ADD COLUMN IF NOT EXISTS seller_notes text;
