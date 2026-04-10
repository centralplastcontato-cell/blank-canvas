-- Add INSERT policy for contract_signatures
CREATE POLICY "Company members can insert signatures"
ON public.contract_signatures
FOR INSERT
WITH CHECK (company_id = ANY (public.get_user_company_ids(auth.uid())));

-- Add UPDATE policy for contract_signatures
CREATE POLICY "Company members can update signatures"
ON public.contract_signatures
FOR UPDATE
USING (company_id = ANY (public.get_user_company_ids(auth.uid())))
WITH CHECK (company_id = ANY (public.get_user_company_ids(auth.uid())));