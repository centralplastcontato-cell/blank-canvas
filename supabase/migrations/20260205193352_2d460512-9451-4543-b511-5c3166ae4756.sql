-- Drop the existing SELECT policy
DROP POLICY IF EXISTS "Users can view leads for permitted units" ON public.campaign_leads;

-- Create new policy that also allows responsavel to view their assigned leads
CREATE POLICY "Users can view leads for permitted units"
ON public.campaign_leads
FOR SELECT
USING (
  (auth.uid() IS NOT NULL) AND (
    -- Admin can see all
    is_admin(auth.uid()) 
    -- User has 'all units' permission
    OR has_permission(auth.uid(), 'leads.unit.all'::text) 
    -- User is the responsavel for this lead (can always see their assigned leads)
    OR (responsavel_id = auth.uid())
    -- User has permission for the specific unit
    OR ((unit IS NOT NULL) AND has_permission(auth.uid(), ('leads.unit.'::text || lower(unit))))
    -- 'As duas' unit - visible to anyone with manchester or trujillo permission
    OR ((unit = 'As duas'::text) AND (
      has_permission(auth.uid(), 'leads.unit.manchester'::text) 
      OR has_permission(auth.uid(), 'leads.unit.trujillo'::text)
      OR has_permission(auth.uid(), 'leads.unit.all'::text)
    ))
    -- Null unit - visible to anyone with any unit permission
    OR ((unit IS NULL) AND (
      has_permission(auth.uid(), 'leads.unit.all'::text) 
      OR has_permission(auth.uid(), 'leads.unit.manchester'::text) 
      OR has_permission(auth.uid(), 'leads.unit.trujillo'::text)
    ))
  )
);