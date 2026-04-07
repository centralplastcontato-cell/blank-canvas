
-- Add SELECT policy for anon users (public onboarding page)
CREATE POLICY "Public can view onboarding by company_id"
ON public.company_onboarding
FOR SELECT
TO anon
USING (true);

-- Add UPDATE policy for anon users (public onboarding page)
CREATE POLICY "Public can update onboarding"
ON public.company_onboarding
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);
