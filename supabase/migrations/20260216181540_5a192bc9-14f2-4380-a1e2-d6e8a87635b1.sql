
-- Fix user_permissions SELECT: restrict from "true" to own permissions + same company admins/owners
DROP POLICY IF EXISTS "Authenticated users can view permissions" ON public.user_permissions;

CREATE POLICY "Users can view own or managed permissions"
ON public.user_permissions
FOR SELECT
USING (
  user_id = auth.uid()
  OR is_admin(auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.user_companies uc_target
    JOIN public.user_companies uc_manager 
      ON uc_manager.company_id = uc_target.company_id
    WHERE uc_target.user_id = user_permissions.user_id
      AND uc_manager.user_id = auth.uid()
      AND uc_manager.role IN ('owner', 'admin')
  )
);
