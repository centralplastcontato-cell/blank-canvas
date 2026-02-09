
-- Update user_companies SELECT policy to allow users to see other members of their companies
-- This uses get_user_company_ids which is SECURITY DEFINER, so no recursion
DROP POLICY IF EXISTS "Users can view company memberships" ON public.user_companies;

CREATE POLICY "Users can view company memberships"
ON public.user_companies
FOR SELECT
USING (
  (user_id = auth.uid())
  OR is_admin(auth.uid())
  OR (company_id = ANY(get_user_company_ids(auth.uid())))
);
