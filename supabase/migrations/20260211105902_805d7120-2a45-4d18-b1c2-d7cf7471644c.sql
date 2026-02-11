-- Add DELETE policy for wapi_messages so conversations can be properly cleaned up
CREATE POLICY "Users can delete messages from their companies"
ON public.wapi_messages
FOR DELETE
USING (
  (company_id = ANY (get_user_company_ids(auth.uid())))
  OR is_admin(auth.uid())
);
