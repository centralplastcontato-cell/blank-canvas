-- Drop existing policies for campaign_leads
DROP POLICY IF EXISTS "Users can view leads for permitted units" ON public.campaign_leads;
DROP POLICY IF EXISTS "Users can update leads for permitted units" ON public.campaign_leads;

-- Create new SELECT policy that includes "As duas" (both units)
-- Logic: User can see a lead if:
-- 1. They are an admin, OR
-- 2. They have leads.unit.all permission, OR
-- 3. The lead's unit is NULL and they have any unit permission, OR
-- 4. The lead's unit matches their specific unit permission, OR
-- 5. The lead's unit is 'As duas' (both units) and they have any unit permission
CREATE POLICY "Users can view leads for permitted units" 
ON public.campaign_leads 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    is_admin(auth.uid()) OR
    has_permission(auth.uid(), 'leads.unit.all') OR
    (unit IS NOT NULL AND has_permission(auth.uid(), 'leads.unit.' || lower(unit))) OR
    (unit = 'As duas' AND (
      has_permission(auth.uid(), 'leads.unit.manchester') OR 
      has_permission(auth.uid(), 'leads.unit.trujillo') OR
      has_permission(auth.uid(), 'leads.unit.all')
    )) OR
    (unit IS NULL AND (
      has_permission(auth.uid(), 'leads.unit.all') OR
      has_permission(auth.uid(), 'leads.unit.manchester') OR 
      has_permission(auth.uid(), 'leads.unit.trujillo')
    ))
  )
);

-- Create new UPDATE policy that includes "As duas" (both units)
CREATE POLICY "Users can update leads for permitted units" 
ON public.campaign_leads 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND (
    is_admin(auth.uid()) OR
    (has_permission(auth.uid(), 'leads.edit') AND (
      has_permission(auth.uid(), 'leads.unit.all') OR
      (unit IS NOT NULL AND has_permission(auth.uid(), 'leads.unit.' || lower(unit))) OR
      (unit = 'As duas' AND (
        has_permission(auth.uid(), 'leads.unit.manchester') OR 
        has_permission(auth.uid(), 'leads.unit.trujillo')
      )) OR
      (unit IS NULL)
    ))
  )
);