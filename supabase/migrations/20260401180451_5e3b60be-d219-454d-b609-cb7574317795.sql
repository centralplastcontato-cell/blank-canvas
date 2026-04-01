
-- Partner products catalog
CREATE TABLE public.partner_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  image_url TEXT,
  category TEXT NOT NULL DEFAULT 'geral',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view partner products of their companies"
  ON public.partner_products FOR SELECT TO authenticated
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can insert partner products for their companies"
  ON public.partner_products FOR INSERT TO authenticated
  WITH CHECK (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can update partner products of their companies"
  ON public.partner_products FOR UPDATE TO authenticated
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can delete partner products of their companies"
  ON public.partner_products FOR DELETE TO authenticated
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE TRIGGER update_partner_products_updated_at
  BEFORE UPDATE ON public.partner_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Partner orders
CREATE TABLE public.partner_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.company_events(id) ON DELETE SET NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente',
  notes TEXT,
  delivery_date DATE,
  client_name TEXT,
  event_title TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view partner orders of their companies"
  ON public.partner_orders FOR SELECT TO authenticated
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can insert partner orders for their companies"
  ON public.partner_orders FOR INSERT TO authenticated
  WITH CHECK (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can update partner orders of their companies"
  ON public.partner_orders FOR UPDATE TO authenticated
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can delete partner orders of their companies"
  ON public.partner_orders FOR DELETE TO authenticated
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE TRIGGER update_partner_orders_updated_at
  BEFORE UPDATE ON public.partner_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validation trigger for order status
CREATE OR REPLACE FUNCTION public.validate_partner_order_status()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('pendente', 'confirmado', 'em_producao', 'entregue', 'cancelado') THEN
    RAISE EXCEPTION 'Invalid partner order status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_partner_order_status_trigger
  BEFORE INSERT OR UPDATE ON public.partner_orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_partner_order_status();

-- Indexes
CREATE INDEX idx_partner_products_company ON public.partner_products(company_id);
CREATE INDEX idx_partner_orders_company ON public.partner_orders(company_id);
CREATE INDEX idx_partner_orders_status ON public.partner_orders(status);
CREATE INDEX idx_partner_orders_event ON public.partner_orders(event_id);
