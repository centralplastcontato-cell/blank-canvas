-- 1. Excluir a instância duplicada vazia (0 conversas, 0 mensagens)
DELETE FROM public.wapi_instances 
WHERE id = '2921d889-8270-48c8-9a05-a263987b252d';

-- 2. Atualizar a política RLS de DELETE para permitir admins (não apenas owners)
DROP POLICY IF EXISTS "Company admins can delete instances" ON public.wapi_instances;

CREATE POLICY "Company admins can delete instances"
ON public.wapi_instances FOR DELETE TO public
USING (
  public.is_admin(auth.uid())
  OR (
    company_id = ANY(public.get_user_company_ids(auth.uid()))
    AND EXISTS (
      SELECT 1 FROM public.user_companies uc
      WHERE uc.user_id = auth.uid()
        AND uc.company_id = wapi_instances.company_id
        AND uc.role IN ('owner', 'admin')
    )
  )
);