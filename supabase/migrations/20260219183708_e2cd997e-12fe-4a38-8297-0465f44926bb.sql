-- Allow anonymous access to companies for public party control page
-- (reads company name, logo, slug, settings for module config)
CREATE POLICY "Anon can view companies for public party control"
ON public.companies
FOR SELECT
TO anon
USING (true);
