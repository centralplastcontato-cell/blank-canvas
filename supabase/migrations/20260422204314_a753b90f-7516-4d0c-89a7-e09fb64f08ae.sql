
-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Company admins can manage lp_bot_settings" ON public.lp_bot_settings;

-- Recreate with broader role access (owner, admin, gestor, member)
CREATE POLICY "Company users can manage lp_bot_settings"
ON public.lp_bot_settings
FOR ALL
TO public
USING (
  is_admin(auth.uid())
  OR (
    company_id = ANY (get_user_company_ids(auth.uid()))
    AND EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = lp_bot_settings.company_id
        AND uc.role IN ('owner', 'admin', 'gestor', 'member')
    )
  )
)
WITH CHECK (
  is_admin(auth.uid())
  OR (
    company_id = ANY (get_user_company_ids(auth.uid()))
    AND EXISTS (
      SELECT 1 FROM user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = lp_bot_settings.company_id
        AND uc.role IN ('owner', 'admin', 'gestor', 'member')
    )
  )
);
