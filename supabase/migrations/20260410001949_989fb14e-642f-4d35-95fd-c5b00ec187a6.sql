-- Fix Noah 5 anos event (72e9fd5a): correct payment amounts with 5.49% card fee

-- 1. Update the paid entrada from R$1900 gross to R$1795.69 net
UPDATE public.event_payments
SET amount = ROUND(1900.00 * (1 - 0.0549), 2)
WHERE id = '7417dfa7-1af6-4f49-8283-1a96f07e07b7';

-- 2. Delete the 5 pending R$800 parcelas and replace with single net row
DELETE FROM public.event_payments
WHERE event_id = '72e9fd5a-5238-41de-83df-e4c0caab7ce3'
  AND type = 'parcela'
  AND status = 'pending';

-- 3. Insert single consolidated net parcela: R$4000 - 5.49% = R$3780.40
INSERT INTO public.event_payments (event_id, company_id, type, amount, due_date, payment_method, status)
VALUES (
  '72e9fd5a-5238-41de-83df-e4c0caab7ce3',
  'a0000000-0000-0000-0000-000000000001',
  'parcela',
  ROUND(4000.00 * (1 - 0.0549), 2),
  '2026-04-29',
  'cartao',
  'pending'
);