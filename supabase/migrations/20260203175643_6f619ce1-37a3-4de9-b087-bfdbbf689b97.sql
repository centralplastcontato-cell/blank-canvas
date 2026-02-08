-- Drop existing SELECT policies on campaign_leads
DROP POLICY IF EXISTS "Admins can view all leads" ON public.campaign_leads;
DROP POLICY IF EXISTS "Comercial can view their leads" ON public.campaign_leads;
DROP POLICY IF EXISTS "Visualizacao can view all leads" ON public.campaign_leads;

-- Create new SELECT policy that respects unit permissions
CREATE POLICY "Users can view leads for permitted units"
ON public.campaign_leads
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    -- Admins can see all
    is_admin(auth.uid())
    -- Users with 'leads.unit.all' permission can see all
    OR has_permission(auth.uid(), 'leads.unit.all')
    -- Users with specific unit permission can see leads from that unit
    OR (unit IS NOT NULL AND has_permission(auth.uid(), 'leads.unit.' || lower(unit)))
    -- Users can see leads without a unit assigned (for backward compatibility)
    OR (unit IS NULL AND (
      has_permission(auth.uid(), 'leads.unit.all')
      OR has_permission(auth.uid(), 'leads.unit.manchester')
      OR has_permission(auth.uid(), 'leads.unit.trujillo')
    ))
  )
);

-- Update UPDATE policy to also respect unit permissions
DROP POLICY IF EXISTS "Admins can update all leads" ON public.campaign_leads;
DROP POLICY IF EXISTS "Comercial can update their leads" ON public.campaign_leads;

CREATE POLICY "Users can update leads for permitted units"
ON public.campaign_leads
FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND (
    -- Admins can update all
    is_admin(auth.uid())
    -- Users with edit permission AND unit access can update
    OR (
      has_permission(auth.uid(), 'leads.edit')
      AND (
        has_permission(auth.uid(), 'leads.unit.all')
        OR (unit IS NOT NULL AND has_permission(auth.uid(), 'leads.unit.' || lower(unit)))
        OR (unit IS NULL)
      )
    )
  )
);