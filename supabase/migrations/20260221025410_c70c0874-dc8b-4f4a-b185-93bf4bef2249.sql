
-- Drop existing policies
DROP POLICY IF EXISTS "Company admins can manage user permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Users can view own or managed permissions" ON public.user_permissions;

-- Create a helper function to check if user can manage permissions
CREATE OR REPLACE FUNCTION public.can_manage_permissions(_user_id uuid, _target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.is_admin(_user_id)
    OR EXISTS (
      SELECT 1
      FROM user_companies uc_target
      WHERE uc_target.user_id = _target_user_id
        AND uc_target.company_id = ANY(public.get_user_company_ids(_user_id))
        AND (
          -- Check company_role (owner/admin)
          EXISTS (
            SELECT 1 FROM user_companies uc_manager
            WHERE uc_manager.user_id = _user_id
              AND uc_manager.company_id = uc_target.company_id
              AND uc_manager.role IN ('owner', 'admin')
          )
          OR
          -- Check app_role (gestor)
          EXISTS (
            SELECT 1 FROM user_roles ur
            WHERE ur.user_id = _user_id
              AND ur.role IN ('admin', 'gestor')
          )
        )
    )
$$;

-- Recreate SELECT policy
CREATE POLICY "Users can view own or managed permissions"
ON public.user_permissions
FOR SELECT
USING (
  user_id = auth.uid()
  OR public.can_manage_permissions(auth.uid(), user_id)
);

-- Recreate ALL (insert/update/delete) policy
CREATE POLICY "Managers can manage user permissions"
ON public.user_permissions
FOR ALL
USING (public.can_manage_permissions(auth.uid(), user_id))
WITH CHECK (public.can_manage_permissions(auth.uid(), user_id));
