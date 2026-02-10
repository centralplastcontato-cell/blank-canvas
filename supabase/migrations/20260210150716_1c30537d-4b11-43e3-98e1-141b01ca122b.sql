-- Allow deletion of lead_history for users in the same company or admins
CREATE POLICY "Users can delete lead history from their companies"
ON public.lead_history
FOR DELETE
USING (
  (company_id = ANY (get_user_company_ids(auth.uid())))
  OR is_admin(auth.uid())
);