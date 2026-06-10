
DROP POLICY IF EXISTS "Company admins can manage templates" ON public.message_templates;

CREATE POLICY "Company members can manage templates"
ON public.message_templates
FOR ALL
TO authenticated
USING (
  public.is_admin(auth.uid())
  OR company_id = ANY (public.get_user_company_ids(auth.uid()))
)
WITH CHECK (
  public.is_admin(auth.uid())
  OR company_id = ANY (public.get_user_company_ids(auth.uid()))
);
