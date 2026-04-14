
-- Tabela de sub-pagamentos (pagamentos parciais) dentro de parcelas
CREATE TABLE public.event_payment_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES public.event_payments(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  amount numeric(12,2) NOT NULL,
  paid_at timestamptz NOT NULL DEFAULT now(),
  payment_method text,
  bank_account_id uuid REFERENCES public.company_bank_accounts(id),
  receipt_url text,
  paid_by text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índice para busca por payment_id
CREATE INDEX idx_event_payment_entries_payment_id ON public.event_payment_entries(payment_id);
CREATE INDEX idx_event_payment_entries_company_id ON public.event_payment_entries(company_id);

-- RLS
ALTER TABLE public.event_payment_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payment entries for their companies"
ON public.event_payment_entries
FOR SELECT
USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can insert payment entries for their companies"
ON public.event_payment_entries
FOR INSERT
WITH CHECK (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can update payment entries for their companies"
ON public.event_payment_entries
FOR UPDATE
USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can delete payment entries for their companies"
ON public.event_payment_entries
FOR DELETE
USING (company_id = ANY(public.get_user_company_ids(auth.uid())));
