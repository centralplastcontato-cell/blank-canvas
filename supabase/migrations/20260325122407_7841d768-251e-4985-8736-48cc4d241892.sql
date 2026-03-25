-- Add missing DELETE policies for cascade deletion of events

-- generated_contracts: allow users to delete contracts of their companies
CREATE POLICY "Users can delete own company contracts"
ON public.generated_contracts
FOR DELETE
TO authenticated
USING (company_id = ANY (public.get_user_company_ids(auth.uid())));

-- contract_audit_logs: allow users to delete audit logs of their companies
CREATE POLICY "Users can delete audit logs of their companies"
ON public.contract_audit_logs
FOR DELETE
TO authenticated
USING (company_id = ANY (public.get_user_company_ids(auth.uid())));

-- event_financial_timeline: allow users to delete timeline of their companies
CREATE POLICY "Users can delete timeline of their companies"
ON public.event_financial_timeline
FOR DELETE
TO authenticated
USING (company_id = ANY (public.get_user_company_ids(auth.uid())));