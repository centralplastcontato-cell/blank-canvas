
-- Fix infinite recursion in user_companies SELECT policy
-- The current policy does a subquery on user_companies itself, causing recursion

DROP POLICY IF EXISTS "Users can view company memberships" ON public.user_companies;

CREATE POLICY "Users can view company memberships"
ON public.user_companies
FOR SELECT
USING (
  user_id = auth.uid()
  OR is_admin(auth.uid())
);
