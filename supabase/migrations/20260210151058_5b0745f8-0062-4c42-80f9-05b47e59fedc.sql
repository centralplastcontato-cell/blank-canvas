-- Fix: Update lead_history records with NULL company_id by joining to campaign_leads
UPDATE lead_history lh
SET company_id = cl.company_id
FROM campaign_leads cl
WHERE lh.lead_id = cl.id
AND lh.company_id IS NULL;

-- Update the DELETE policy to also handle any remaining NULL company_id records
DROP POLICY IF EXISTS "Users can delete lead history from their companies" ON public.lead_history;
CREATE POLICY "Users can delete lead history from their companies"
ON public.lead_history
FOR DELETE
USING (
  company_id IS NULL
  OR (company_id = ANY (get_user_company_ids(auth.uid())))
  OR is_admin(auth.uid())
);