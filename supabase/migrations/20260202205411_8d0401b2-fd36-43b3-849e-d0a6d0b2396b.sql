-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

-- Recreate as PERMISSIVE policies (so ANY matching policy allows access)
CREATE POLICY "Users can view own role" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update roles" 
ON public.user_roles 
FOR UPDATE 
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete roles" 
ON public.user_roles 
FOR DELETE 
USING (is_admin(auth.uid()));