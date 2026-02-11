-- Drop the existing policy and recreate with NULL company_id handling
DROP POLICY IF EXISTS "Users can delete messages from their companies" ON public.wapi_messages;

CREATE POLICY "Users can delete messages from their companies"
ON public.wapi_messages
FOR DELETE
USING (
  is_admin(auth.uid())
  OR (company_id IS NOT NULL AND company_id = ANY (get_user_company_ids(auth.uid())))
  OR (company_id IS NULL AND conversation_id IN (
    SELECT id FROM wapi_conversations WHERE company_id = ANY (get_user_company_ids(auth.uid()))
  ))
);