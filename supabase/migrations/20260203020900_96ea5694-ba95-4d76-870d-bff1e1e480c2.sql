-- Drop old RLS policy that used wrong permission names
DROP POLICY IF EXISTS "Users can view instances for permitted units" ON public.wapi_instances;

-- Create new RLS policy using correct permission names
CREATE POLICY "Users can view instances for permitted units"
ON public.wapi_instances
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND (
    is_admin(auth.uid()) 
    OR has_permission(auth.uid(), 'leads.unit.' || lower(unit))
    OR has_permission(auth.uid(), 'leads.unit.all')
  )
);