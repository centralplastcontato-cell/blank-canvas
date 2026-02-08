-- Create bot settings table for global configuration per instance
CREATE TABLE public.wapi_bot_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id UUID NOT NULL REFERENCES public.wapi_instances(id) ON DELETE CASCADE,
  bot_enabled BOOLEAN NOT NULL DEFAULT false,
  test_mode_enabled BOOLEAN NOT NULL DEFAULT false,
  test_mode_number TEXT,
  welcome_message TEXT DEFAULT 'Olá! 👋 Bem-vindo ao Castelo da Diversão! Para podermos te ajudar melhor, preciso de algumas informações.',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(instance_id)
);

-- Create VIP numbers table (numbers that should never receive bot messages)
CREATE TABLE public.wapi_vip_numbers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instance_id UUID NOT NULL REFERENCES public.wapi_instances(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT,
  reason TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(instance_id, phone)
);

-- Add bot control columns to conversations
ALTER TABLE public.wapi_conversations 
ADD COLUMN bot_enabled BOOLEAN DEFAULT true,
ADD COLUMN bot_step TEXT,
ADD COLUMN bot_data JSONB DEFAULT '{}'::jsonb;

-- Enable RLS on new tables
ALTER TABLE public.wapi_bot_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wapi_vip_numbers ENABLE ROW LEVEL SECURITY;

-- RLS policies for bot_settings (admins can manage, users with config.whatsapp.automations can view/edit)
CREATE POLICY "Admins can manage bot settings"
ON public.wapi_bot_settings
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users with automation permission can view bot settings"
ON public.wapi_bot_settings
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  (is_admin(auth.uid()) OR has_permission(auth.uid(), 'config.whatsapp.automations'))
);

CREATE POLICY "Users with automation permission can update bot settings"
ON public.wapi_bot_settings
FOR UPDATE
USING (
  auth.uid() IS NOT NULL AND
  (is_admin(auth.uid()) OR has_permission(auth.uid(), 'config.whatsapp.automations'))
);

-- RLS policies for VIP numbers
CREATE POLICY "Admins can manage VIP numbers"
ON public.wapi_vip_numbers
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users with automation permission can view VIP numbers"
ON public.wapi_vip_numbers
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  (is_admin(auth.uid()) OR has_permission(auth.uid(), 'config.whatsapp.automations'))
);

CREATE POLICY "Users with automation permission can manage VIP numbers"
ON public.wapi_vip_numbers
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  (is_admin(auth.uid()) OR has_permission(auth.uid(), 'config.whatsapp.automations'))
);

CREATE POLICY "Users with automation permission can delete VIP numbers"
ON public.wapi_vip_numbers
FOR DELETE
USING (
  auth.uid() IS NOT NULL AND
  (is_admin(auth.uid()) OR has_permission(auth.uid(), 'config.whatsapp.automations'))
);

-- Create trigger for updated_at on bot_settings
CREATE TRIGGER update_wapi_bot_settings_updated_at
BEFORE UPDATE ON public.wapi_bot_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add the new permission for automations if not exists
INSERT INTO public.permission_definitions (code, name, description, category, sort_order)
VALUES ('config.whatsapp.automations', 'Configurar Automações WhatsApp', 'Permite configurar o bot de qualificação e lista VIP', 'Configurações', 45)
ON CONFLICT (code) DO NOTHING;