CREATE OR REPLACE FUNCTION public.get_company_notification_targets(
  p_company_id uuid,
  p_unit_permission text
)
RETURNS TABLE(user_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT uc.user_id
  FROM public.user_companies uc
  WHERE uc.company_id = p_company_id
    AND (
      -- Admin role: always included
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = uc.user_id AND ur.role = 'admin'
      )
      OR
      -- Has the specific unit permission OR leads.unit.all = true
      EXISTS (
        SELECT 1 FROM public.user_permissions up
        WHERE up.user_id = uc.user_id
          AND up.granted = true
          AND up.permission IN (p_unit_permission, 'leads.unit.all')
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_company_notification_targets(uuid, text) TO authenticated, service_role;