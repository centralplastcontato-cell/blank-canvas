-- Create a security definer function to get active profiles for transfer purposes
-- This allows users with transfer permission to see other users' names
CREATE OR REPLACE FUNCTION public.get_profiles_for_transfer()
RETURNS TABLE(user_id uuid, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.full_name
  FROM public.profiles p
  WHERE p.is_active = true
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_profiles_for_transfer() TO authenticated;