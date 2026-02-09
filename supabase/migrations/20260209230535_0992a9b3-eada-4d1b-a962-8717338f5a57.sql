
-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Admins can manage user permissions" ON public.user_permissions;

-- Create new policy that allows company admins/owners to manage permissions for users in their companies
CREATE POLICY "Company admins can manage user permissions"
ON public.user_permissions
FOR ALL
USING (
  is_admin(auth.uid())
  OR (
    EXISTS (
      SELECT 1 FROM user_companies uc_target
      WHERE uc_target.user_id = user_permissions.user_id
        AND uc_target.company_id = ANY(get_user_company_ids(auth.uid()))
        AND EXISTS (
          SELECT 1 FROM user_companies uc_manager
          WHERE uc_manager.user_id = auth.uid()
            AND uc_manager.company_id = uc_target.company_id
            AND uc_manager.role IN ('owner', 'admin')
        )
    )
  )
)
WITH CHECK (
  is_admin(auth.uid())
  OR (
    EXISTS (
      SELECT 1 FROM user_companies uc_target
      WHERE uc_target.user_id = user_permissions.user_id
        AND uc_target.company_id = ANY(get_user_company_ids(auth.uid()))
        AND EXISTS (
          SELECT 1 FROM user_companies uc_manager
          WHERE uc_manager.user_id = auth.uid()
            AND uc_manager.company_id = uc_target.company_id
            AND uc_manager.role IN ('owner', 'admin')
        )
    )
  )
);
