
-- Restrict is_admin to only centralplast.contato@gmail.com
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN auth.users au ON au.id = ur.user_id
    WHERE ur.user_id = _user_id
      AND ur.role = 'admin'
      AND au.email = 'centralplast.contato@gmail.com'
  )
$$;

-- Also ensure no other users have admin role (except Victor)
UPDATE public.user_roles 
SET role = 'gestor' 
WHERE role = 'admin' 
AND user_id != (SELECT id FROM auth.users WHERE email = 'centralplast.contato@gmail.com' LIMIT 1);
