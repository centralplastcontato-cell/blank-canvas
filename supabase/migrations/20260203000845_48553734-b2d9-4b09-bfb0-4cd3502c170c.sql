-- Create permission_definitions table (catalog of available permissions)
CREATE TABLE public.permission_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.permission_definitions ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read permission definitions
CREATE POLICY "Authenticated users can view permission definitions"
ON public.permission_definitions
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only admins can manage permission definitions
CREATE POLICY "Admins can manage permission definitions"
ON public.permission_definitions
FOR ALL
USING (is_admin(auth.uid()));

-- Create user_permissions table
CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  permission TEXT NOT NULL REFERENCES public.permission_definitions(code) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL DEFAULT true,
  granted_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, permission)
);

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Users can view their own permissions
CREATE POLICY "Users can view own permissions"
ON public.user_permissions
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all permissions
CREATE POLICY "Admins can view all permissions"
ON public.user_permissions
FOR SELECT
USING (is_admin(auth.uid()));

-- Admins can manage all permissions
CREATE POLICY "Admins can insert permissions"
ON public.user_permissions
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update permissions"
ON public.user_permissions
FOR UPDATE
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete permissions"
ON public.user_permissions
FOR DELETE
USING (is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_user_permissions_updated_at
BEFORE UPDATE ON public.user_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create security definer function to check permissions
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT granted FROM public.user_permissions WHERE user_id = _user_id AND permission = _permission),
    false
  )
$$;

-- Insert initial permission definitions
INSERT INTO public.permission_definitions (code, name, description, category, sort_order) VALUES
  ('leads.view', 'Visualizar leads', 'Permite visualizar a lista de leads', 'Leads', 10),
  ('leads.edit', 'Editar leads', 'Permite editar informações de leads', 'Leads', 20),
  ('leads.delete', 'Excluir leads', 'Permite excluir leads do sistema', 'Leads', 25),
  ('leads.export', 'Exportar leads', 'Permite exportar leads para CSV', 'Leads', 30),
  ('leads.assign', 'Atribuir responsável', 'Permite atribuir responsável a leads', 'Leads', 40),
  ('users.view', 'Ver usuários', 'Permite visualizar lista de usuários', 'Usuários', 50),
  ('users.manage', 'Gerenciar usuários', 'Permite criar, editar e excluir usuários', 'Usuários', 60),
  ('permissions.manage', 'Gerenciar permissões', 'Permite gerenciar permissões de outros usuários', 'Sistema', 70);