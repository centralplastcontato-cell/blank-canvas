-- Criar tabela para armazenar presets de permissões customizáveis
CREATE TABLE public.permission_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'Shield',
  permissions JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.permission_presets ENABLE ROW LEVEL SECURITY;

-- Policies: Admins can manage, authenticated can view
CREATE POLICY "Admins can manage permission presets" 
ON public.permission_presets 
FOR ALL 
USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view permission presets" 
ON public.permission_presets 
FOR SELECT 
USING (true);

-- Insert default presets
INSERT INTO permission_presets (name, description, icon, permissions, is_default, sort_order) VALUES
(
  'Admin (Tudo)', 
  'Acesso total ao sistema', 
  'Crown',
  '{
    "leads.view": true, "leads.edit": true, "leads.edit.name": true, "leads.edit.description": true,
    "leads.delete": true, "leads.export": true, "leads.assign": true, "leads.unit.all": true,
    "leads.unit.manchester": true, "leads.unit.trujillo": true, "users.view": true, "users.manage": true,
    "permissions.manage": true, "b2b.view": true, "whatsapp.view": true, "whatsapp.send": true,
    "whatsapp.materials": true, "whatsapp.audio": true, "whatsapp.close": true, "whatsapp.favorite": true,
    "whatsapp.bot.toggle": true, "whatsapp.share.group": true, "config.view": true, "config.bot": true,
    "config.templates": true, "config.materials": true, "config.vip": true, "config.connection": true,
    "dashboard.view": true, "dashboard.metrics": true, "b2b.proposals.create": true, "b2b.proposals.edit": true,
    "b2b.leads.manage": true
  }'::jsonb,
  true,
  1
),
(
  'Comercial Manchester', 
  'Acesso comercial à unidade Manchester', 
  'Building2',
  '{
    "leads.view": true, "leads.edit": true, "leads.edit.name": false, "leads.edit.description": true,
    "leads.delete": false, "leads.export": true, "leads.assign": false, "leads.unit.all": false,
    "leads.unit.manchester": true, "leads.unit.trujillo": false, "users.view": false, "users.manage": false,
    "permissions.manage": false, "b2b.view": false, "whatsapp.view": true, "whatsapp.send": true,
    "whatsapp.materials": true, "whatsapp.audio": true, "whatsapp.close": true, "whatsapp.favorite": true,
    "whatsapp.bot.toggle": false, "whatsapp.share.group": true, "config.view": false, "config.bot": false,
    "config.templates": false, "config.materials": false, "config.vip": false, "config.connection": false,
    "dashboard.view": true, "dashboard.metrics": false, "b2b.proposals.create": false, "b2b.proposals.edit": false,
    "b2b.leads.manage": false
  }'::jsonb,
  true,
  2
),
(
  'Comercial Trujillo', 
  'Acesso comercial à unidade Trujillo', 
  'MapPin',
  '{
    "leads.view": true, "leads.edit": true, "leads.edit.name": false, "leads.edit.description": true,
    "leads.delete": false, "leads.export": true, "leads.assign": false, "leads.unit.all": false,
    "leads.unit.manchester": false, "leads.unit.trujillo": true, "users.view": false, "users.manage": false,
    "permissions.manage": false, "b2b.view": false, "whatsapp.view": true, "whatsapp.send": true,
    "whatsapp.materials": true, "whatsapp.audio": true, "whatsapp.close": true, "whatsapp.favorite": true,
    "whatsapp.bot.toggle": false, "whatsapp.share.group": true, "config.view": false, "config.bot": false,
    "config.templates": false, "config.materials": false, "config.vip": false, "config.connection": false,
    "dashboard.view": true, "dashboard.metrics": false, "b2b.proposals.create": false, "b2b.proposals.edit": false,
    "b2b.leads.manage": false
  }'::jsonb,
  true,
  3
);