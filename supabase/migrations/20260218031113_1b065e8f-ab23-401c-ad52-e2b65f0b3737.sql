
-- Allow anon users to SELECT freelancer_evaluations (needed to load existing evaluations on public page)
CREATE POLICY "Anon can view evaluations by staff entry"
ON public.freelancer_evaluations
FOR SELECT
TO anon
USING (true);

-- Allow anon users to INSERT freelancer_evaluations (public evaluation form)
CREATE POLICY "Anon can insert evaluations"
ON public.freelancer_evaluations
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anon users to UPDATE freelancer_evaluations (edit existing evaluation)
CREATE POLICY "Anon can update evaluations"
ON public.freelancer_evaluations
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);
