
DROP POLICY "Company admins can update companies" ON public.companies;
CREATE POLICY "Company admins can update companies" ON public.companies
  FOR UPDATE TO authenticated
  USING (
    is_admin(auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.company_id = companies.id
        AND uc.user_id = auth.uid()
        AND uc.role IN ('owner', 'admin')
    )
  );
