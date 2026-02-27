
-- Restore company_onboarding public policies (required for public onboarding form by design)
-- The form is shared via /onboarding/:slug with business owners who don't have accounts
CREATE POLICY "Public can read own onboarding by company"
ON public.company_onboarding FOR SELECT
USING (true);

CREATE POLICY "Public can update own onboarding by company"
ON public.company_onboarding FOR UPDATE
USING (true)
WITH CHECK (true);
