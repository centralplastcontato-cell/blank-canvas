-- ===========================================
-- CRM LEAD MANAGEMENT SYSTEM SCHEMA
-- ===========================================

-- 1. Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'comercial', 'visualizacao');

-- 2. Create enum for lead status
CREATE TYPE public.lead_status AS ENUM ('novo', 'em_contato', 'orcamento_enviado', 'aguardando_resposta', 'fechado', 'perdido');

-- 3. Create profiles table for user management
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'visualizacao',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- 5. Add new columns to campaign_leads (day_of_month already exists)
ALTER TABLE public.campaign_leads
ADD COLUMN status lead_status NOT NULL DEFAULT 'novo',
ADD COLUMN responsavel_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN observacoes TEXT;

-- 6. Create lead_history table for audit trail
CREATE TABLE public.lead_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.campaign_leads(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name TEXT,
    action TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Create message_templates table
CREATE TABLE public.message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    template TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default message templates
INSERT INTO public.message_templates (name, template, sort_order) VALUES
('Primeiro contato', 'Oi {{nome}}! 😊 Aqui é do Castelo da Diversão 🏰🎉 Vi seu pedido para festa em {{mes}} com {{convidados}}. Posso te enviar as opções e valores?', 1),
('Envio de orçamento', 'Oi {{nome}}! 👋 Segue seu orçamento com a promoção da campanha {{campanha}}. Quer que eu confirme disponibilidade da data?', 2),
('Follow-up', 'Oi {{nome}}! Tudo bem? 😊 Passando pra ver se você conseguiu avaliar o orçamento. Posso te ajudar a garantir sua data?', 3);

-- ===========================================
-- SECURITY: Enable RLS on all tables
-- ===========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- SECURITY DEFINER FUNCTIONS
-- ===========================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

-- Function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- ===========================================
-- RLS POLICIES: profiles
-- ===========================================

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can insert profiles
CREATE POLICY "Admins can insert profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- Admins can update profiles
CREATE POLICY "Admins can update profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- ===========================================
-- RLS POLICIES: user_roles
-- ===========================================

-- Admins can view all roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Users can view their own role
CREATE POLICY "Users can view own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can manage roles
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- ===========================================
-- RLS POLICIES: campaign_leads (UPDATE)
-- ===========================================

-- Drop existing restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Apenas usuários autenticados podem ver leads" ON public.campaign_leads;
DROP POLICY IF EXISTS "Usuários autenticados podem excluir leads" ON public.campaign_leads;

-- Admins can see all leads
CREATE POLICY "Admins can view all leads"
ON public.campaign_leads
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Comercial can see leads assigned to them or unassigned
CREATE POLICY "Comercial can view their leads"
ON public.campaign_leads
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'comercial') AND 
  (responsavel_id = auth.uid() OR responsavel_id IS NULL)
);

-- Visualizacao can see all leads (read-only)
CREATE POLICY "Visualizacao can view all leads"
ON public.campaign_leads
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'visualizacao'));

-- Admins can update all leads
CREATE POLICY "Admins can update all leads"
ON public.campaign_leads
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Comercial can update their assigned leads
CREATE POLICY "Comercial can update their leads"
ON public.campaign_leads
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'comercial') AND 
  responsavel_id = auth.uid()
);

-- Admins can delete leads
CREATE POLICY "Admins can delete leads"
ON public.campaign_leads
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- ===========================================
-- RLS POLICIES: lead_history
-- ===========================================

-- Authenticated users can view history
CREATE POLICY "Authenticated users can view history"
ON public.lead_history
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Authenticated users can insert history
CREATE POLICY "Authenticated users can insert history"
ON public.lead_history
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- ===========================================
-- RLS POLICIES: message_templates
-- ===========================================

-- Anyone authenticated can view templates
CREATE POLICY "Authenticated users can view templates"
ON public.message_templates
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Admins can manage templates
CREATE POLICY "Admins can manage templates"
ON public.message_templates
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- ===========================================
-- TRIGGERS for updated_at
-- ===========================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_message_templates_updated_at
BEFORE UPDATE ON public.message_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();