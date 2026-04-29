ALTER TABLE public.event_payment_entries ADD COLUMN IF NOT EXISTS compensation_date date;
ALTER TABLE public.event_payments ADD COLUMN IF NOT EXISTS compensation_date date;