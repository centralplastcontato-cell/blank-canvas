
-- Allow anonymous users to read a specific staff entry by id
CREATE POLICY "Anon can view staff entry by id"
ON public.event_staff_entries
FOR SELECT
TO anon
USING (true);

-- Allow anonymous users to update staff_data and notes only
CREATE POLICY "Anon can update staff entry"
ON public.event_staff_entries
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);
