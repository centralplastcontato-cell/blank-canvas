-- Create a security definer function to get profiles for transfer
-- This bypasses RLS to allow fetching profiles for the transfer dialog
CREATE OR REPLACE FUNCTION public.get_profiles_for_transfer()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  full_name text,
  email text,
  avatar_url text,
  is_active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.user_id,
    p.full_name,
    p.email,
    p.avatar_url,
    p.is_active
  FROM public.profiles p
  WHERE p.is_active = true
  ORDER BY p.full_name
$$;