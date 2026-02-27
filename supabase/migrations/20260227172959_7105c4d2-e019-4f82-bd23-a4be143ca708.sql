CREATE POLICY "Anon can view units for public pages"
ON company_units FOR SELECT
USING (true);