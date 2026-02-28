CREATE POLICY "Company admins can update freelancer responses"
  ON freelancer_responses FOR UPDATE
  USING (
    is_admin(auth.uid()) OR (
      company_id = ANY(get_user_company_ids(auth.uid()))
      AND EXISTS (
        SELECT 1 FROM user_companies uc
        WHERE uc.user_id = auth.uid()
        AND uc.company_id = freelancer_responses.company_id
        AND uc.role = ANY(ARRAY['owner','admin'])
      )
    )
  );