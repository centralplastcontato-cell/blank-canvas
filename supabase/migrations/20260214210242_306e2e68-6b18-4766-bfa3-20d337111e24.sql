-- Fix 1: Scope get_profiles_for_transfer() to user's companies
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
  SELECT DISTINCT
    p.id,
    p.user_id,
    p.full_name,
    p.email,
    p.avatar_url,
    p.is_active
  FROM public.profiles p
  INNER JOIN public.user_companies uc ON p.user_id = uc.user_id
  WHERE p.is_active = true
    AND (
      uc.company_id IN (
        SELECT company_id 
        FROM public.user_companies 
        WHERE user_id = auth.uid()
      )
      OR public.is_admin(auth.uid())
    )
  ORDER BY p.full_name
$$;

-- Fix 2: Restrict onboarding UPDATE to admins/company members only
DROP POLICY IF EXISTS "Anyone can update onboarding" ON public.company_onboarding;

CREATE POLICY "Admins and company members can update onboarding"
ON public.company_onboarding FOR UPDATE
USING (
  is_admin(auth.uid()) 
  OR company_id = ANY(get_user_company_ids(auth.uid()))
);

-- Fix 3: Add file size limit to onboarding-uploads bucket
UPDATE storage.buckets 
SET file_size_limit = 10485760
WHERE id = 'onboarding-uploads';
