
-- 1) Drop exposed backup table
DROP TABLE IF EXISTS public.wapi_messages_dedup_backup_20260514;

-- 2) company_units: replace anon-wide SELECT with scoped RPC
DROP POLICY IF EXISTS "Anon can view active units for public pages" ON public.company_units;

CREATE OR REPLACE FUNCTION public.get_active_units_by_company_id(_company_id uuid)
RETURNS TABLE(name text, sort_order integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT cu.name, cu.sort_order
  FROM public.company_units cu
  WHERE cu.company_id = _company_id
    AND cu.is_active = true
  ORDER BY cu.sort_order;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_units_by_company_id(uuid) TO anon, authenticated;

-- 3) Storage: company-logos — restrict writes to global admins
DROP POLICY IF EXISTS "Admins can upload company logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update company logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete company logos" ON storage.objects;

CREATE POLICY "Admins can upload company logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'company-logos' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can update company logos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'company-logos' AND public.is_admin(auth.uid()))
WITH CHECK (bucket_id = 'company-logos' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete company logos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'company-logos' AND public.is_admin(auth.uid()));

-- 4) Storage: landing-pages — restrict writes to global admins
DROP POLICY IF EXISTS "Admins can upload landing page images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update landing page images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete landing page images" ON storage.objects;

CREATE POLICY "Admins can upload landing page images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'landing-pages' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can update landing page images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'landing-pages' AND public.is_admin(auth.uid()))
WITH CHECK (bucket_id = 'landing-pages' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete landing page images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'landing-pages' AND public.is_admin(auth.uid()));

-- 5) Storage: event-info-attachments — scope writes to user's company folder
DROP POLICY IF EXISTS "Authenticated users can upload event info attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete event info attachments" ON storage.objects;

CREATE POLICY "Company members can upload event info attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'event-info-attachments'
  AND (
    public.is_admin(auth.uid())
    OR (((storage.foldername(name))[1])::uuid = ANY (public.get_user_company_ids(auth.uid())))
  )
);

CREATE POLICY "Company members can delete event info attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'event-info-attachments'
  AND (
    public.is_admin(auth.uid())
    OR (((storage.foldername(name))[1])::uuid = ANY (public.get_user_company_ids(auth.uid())))
  )
);
