-- Allow public/anonymous access to company_onboarding for the onboarding flow
-- This is by design: the onboarding page is accessed via public link without auth

-- Allow anon to insert new onboarding records
CREATE POLICY "Public can insert onboarding"
  ON public.company_onboarding
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Allow anon to update onboarding records (for step-by-step progress saves)
CREATE POLICY "Public can update onboarding"
  ON public.company_onboarding
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Allow anon to read onboarding (needed to check existing progress by company_id)
CREATE POLICY "Public can read onboarding"
  ON public.company_onboarding
  FOR SELECT
  TO anon, authenticated
  USING (true);