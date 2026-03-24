
-- Create pre_reservations table
CREATE TABLE public.pre_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.campaign_leads(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text,
  event_date date NOT NULL,
  unit text,
  reservation_days integer NOT NULL DEFAULT 3,
  reservation_start_at timestamptz NOT NULL DEFAULT now(),
  reservation_expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'ativa',
  notes text,
  created_by uuid REFERENCES auth.users(id),
  converted_event_id uuid REFERENCES public.company_events(id) ON DELETE SET NULL,
  cancellation_reason text,
  last_automation_sent_at timestamptz,
  customer_response_status text,
  customer_response_text text,
  customer_response_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.pre_reservations ENABLE ROW LEVEL SECURITY;

-- Validation trigger instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_pre_reservation_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status NOT IN ('ativa', 'convertida', 'expirada', 'cancelada') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_pre_reservation_status
  BEFORE INSERT OR UPDATE ON public.pre_reservations
  FOR EACH ROW EXECUTE FUNCTION public.validate_pre_reservation_status();

-- Updated_at trigger
CREATE TRIGGER trg_pre_reservations_updated_at
  BEFORE UPDATE ON public.pre_reservations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS policies
CREATE POLICY "Users can view pre_reservations of their companies"
  ON public.pre_reservations FOR SELECT TO authenticated
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can insert pre_reservations for their companies"
  ON public.pre_reservations FOR INSERT TO authenticated
  WITH CHECK (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can update pre_reservations of their companies"
  ON public.pre_reservations FOR UPDATE TO authenticated
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can delete pre_reservations of their companies"
  ON public.pre_reservations FOR DELETE TO authenticated
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

-- Create pre_reservation_settings table
CREATE TABLE public.pre_reservation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE,
  is_enabled boolean DEFAULT false,
  send_on_last_day boolean DEFAULT true,
  hours_before_expiry integer DEFAULT 10,
  expiry_message text DEFAULT 'Olá {{nome}}, sua pré-reserva para o dia {{data_festa}} vence hoje ({{data_validade}}). Gostaria de confirmar sua reserva? Estamos à disposição! 🎉',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.pre_reservation_settings ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_pre_reservation_settings_updated_at
  BEFORE UPDATE ON public.pre_reservation_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Users can view pre_reservation_settings of their companies"
  ON public.pre_reservation_settings FOR SELECT TO authenticated
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can insert pre_reservation_settings for their companies"
  ON public.pre_reservation_settings FOR INSERT TO authenticated
  WITH CHECK (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can update pre_reservation_settings of their companies"
  ON public.pre_reservation_settings FOR UPDATE TO authenticated
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())));
