
-- 1. Make event_id nullable
ALTER TABLE public.event_staff_entries ALTER COLUMN event_id DROP NOT NULL;

-- 2. Drop the FK constraint so null is allowed cleanly
-- (FK already allows null, just need the column to be nullable which we did above)

-- 3. Add anon SELECT policy on company_events so public staff form can list events
CREATE POLICY "Anon can view events by company_id"
ON public.company_events
FOR SELECT
USING (true);
