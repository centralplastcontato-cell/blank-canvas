
ALTER TABLE public.event_payments
  ADD COLUMN IF NOT EXISTS card_operator_id uuid REFERENCES public.company_card_fees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS card_installments integer,
  ADD COLUMN IF NOT EXISTS card_fee_percent numeric(6,3),
  ADD COLUMN IF NOT EXISTS gross_amount numeric(12,2);

ALTER TABLE public.event_payment_entries
  ADD COLUMN IF NOT EXISTS card_operator_id uuid REFERENCES public.company_card_fees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS card_installments integer,
  ADD COLUMN IF NOT EXISTS card_fee_percent numeric(6,3),
  ADD COLUMN IF NOT EXISTS gross_amount numeric(12,2);
