
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;

CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Company peers can view non-admin roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  role <> 'admin'
  AND EXISTS (
    SELECT 1
    FROM public.user_companies uc1
    JOIN public.user_companies uc2 ON uc1.company_id = uc2.company_id
    WHERE uc1.user_id = auth.uid()
      AND uc2.user_id = user_roles.user_id
  )
);

REVOKE SELECT (otp_code) ON public.contract_signatures FROM authenticated, anon;
