-- Add unit column to wapi_instances
ALTER TABLE public.wapi_instances 
ADD COLUMN unit text CHECK (unit IN ('Manchester', 'Trujillo'));

-- Create index for better performance on unit queries
CREATE INDEX idx_wapi_instances_unit ON public.wapi_instances(unit);

-- Update RLS policies to allow admins to manage all instances
DROP POLICY IF EXISTS "Users can view own instance" ON public.wapi_instances;
DROP POLICY IF EXISTS "Users can insert own instance" ON public.wapi_instances;
DROP POLICY IF EXISTS "Users can update own instance" ON public.wapi_instances;
DROP POLICY IF EXISTS "Users can delete own instance" ON public.wapi_instances;

-- Admins can do everything with instances
CREATE POLICY "Admins can manage all instances"
ON public.wapi_instances
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- All authenticated users can view instances for units they have permission for
CREATE POLICY "Users can view instances for permitted units"
ON public.wapi_instances
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    -- Admin can see all
    is_admin(auth.uid())
    OR
    -- User has permission for this specific unit
    has_permission(auth.uid(), 'units.view_' || lower(unit))
    OR
    -- User has permission to view all units
    has_permission(auth.uid(), 'units.view_all')
  )
);

-- Add new permission definitions for unit WhatsApp access
INSERT INTO public.permission_definitions (code, name, description, category, sort_order, is_active)
VALUES 
  ('whatsapp.use', 'Usar WhatsApp', 'Permite usar o chat do WhatsApp da unidade permitida', 'WhatsApp', 50, true),
  ('whatsapp.manage', 'Gerenciar WhatsApp', 'Permite configurar instâncias do WhatsApp (apenas Admin)', 'WhatsApp', 51, true)
ON CONFLICT (code) DO NOTHING;