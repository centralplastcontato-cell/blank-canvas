-- Financial module tables

-- 1. Event Payments (parcelas)
CREATE TABLE public.event_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.company_events(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'parcela' CHECK (type IN ('entrada', 'parcela')),
  amount numeric(12,2) NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'late')),
  payment_method text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Event Extras
CREATE TABLE public.event_extras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.company_events(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Event Discounts
CREATE TABLE public.event_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.company_events(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'fixed' CHECK (type IN ('fixed', 'percentage')),
  value numeric(12,2) NOT NULL DEFAULT 0,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Event Financial Timeline
CREATE TABLE public.event_financial_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.company_events(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type text NOT NULL,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_extras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_financial_timeline ENABLE ROW LEVEL SECURITY;

-- RLS Policies for event_payments
CREATE POLICY "Users can view payments of their companies" ON public.event_payments
  FOR SELECT TO authenticated
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can insert payments for their companies" ON public.event_payments
  FOR INSERT TO authenticated
  WITH CHECK (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can update payments of their companies" ON public.event_payments
  FOR UPDATE TO authenticated
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can delete payments of their companies" ON public.event_payments
  FOR DELETE TO authenticated
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

-- RLS Policies for event_extras
CREATE POLICY "Users can view extras of their companies" ON public.event_extras
  FOR SELECT TO authenticated
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can insert extras for their companies" ON public.event_extras
  FOR INSERT TO authenticated
  WITH CHECK (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can update extras of their companies" ON public.event_extras
  FOR UPDATE TO authenticated
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can delete extras of their companies" ON public.event_extras
  FOR DELETE TO authenticated
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

-- RLS Policies for event_discounts
CREATE POLICY "Users can view discounts of their companies" ON public.event_discounts
  FOR SELECT TO authenticated
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can insert discounts for their companies" ON public.event_discounts
  FOR INSERT TO authenticated
  WITH CHECK (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can update discounts of their companies" ON public.event_discounts
  FOR UPDATE TO authenticated
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can delete discounts of their companies" ON public.event_discounts
  FOR DELETE TO authenticated
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

-- RLS Policies for event_financial_timeline
CREATE POLICY "Users can view timeline of their companies" ON public.event_financial_timeline
  FOR SELECT TO authenticated
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can insert timeline for their companies" ON public.event_financial_timeline
  FOR INSERT TO authenticated
  WITH CHECK (company_id = ANY(public.get_user_company_ids(auth.uid())));

-- Updated_at trigger for payments
CREATE TRIGGER set_event_payments_updated_at
  BEFORE UPDATE ON public.event_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert permission definitions for financial module
INSERT INTO public.permission_definitions (code, name, description, category, sort_order) VALUES
  ('financial.view', 'Ver Financeiro', 'Pode ver a aba financeiro nos eventos', 'Financeiro', 600),
  ('financial.values', 'Ver Valores', 'Pode ver valores monetários no financeiro', 'Financeiro', 601),
  ('financial.edit', 'Editar Financeiro', 'Pode editar parcelas, extras e descontos', 'Financeiro', 602),
  ('financial.payments', 'Registrar Pagamentos', 'Pode marcar parcelas como pagas', 'Financeiro', 603)
ON CONFLICT DO NOTHING;