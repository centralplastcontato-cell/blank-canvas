-- Remove orphan "Ajuste pós-contrato" parcela for Gustavo Yamamoto event
-- so the user can re-save the festa and see the 10 split parcelas correctly.
DELETE FROM public.event_payments
WHERE event_id = '91cec1d8-7e91-4273-9a44-191def2e455e'
  AND status = 'pending'
  AND notes ILIKE '%Ajuste pós-contrato%';