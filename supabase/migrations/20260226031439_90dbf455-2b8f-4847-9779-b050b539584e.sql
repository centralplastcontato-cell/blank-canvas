
DROP POLICY "Company admins can delete sales materials" ON public.sales_materials;

CREATE POLICY "Company admins can delete sales materials"
ON public.sales_materials
FOR DELETE
TO authenticated
USING (
  is_admin(auth.uid()) OR (
    company_id = ANY (get_user_company_ids(auth.uid()))
    AND EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = sales_materials.company_id
        AND uc.role IN ('owner', 'admin')
    )
  )
);
