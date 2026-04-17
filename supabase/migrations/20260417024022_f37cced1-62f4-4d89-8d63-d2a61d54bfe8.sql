UPDATE public.event_payments
SET gross_amount = amount
WHERE gross_amount IS NULL 
  AND (
    payment_method ILIKE '%cartao%' OR 
    payment_method ILIKE '%cartão%' OR 
    payment_method ILIKE '%card%' OR 
    payment_method ILIKE '%credito%' OR 
    payment_method ILIKE '%crédito%' OR 
    payment_method ILIKE '%debito%' OR 
    payment_method ILIKE '%débito%'
  );

UPDATE public.event_payment_entries
SET gross_amount = amount
WHERE gross_amount IS NULL 
  AND (
    payment_method ILIKE '%cartao%' OR 
    payment_method ILIKE '%cartão%' OR 
    payment_method ILIKE '%card%' OR 
    payment_method ILIKE '%credito%' OR 
    payment_method ILIKE '%crédito%' OR 
    payment_method ILIKE '%debito%' OR 
    payment_method ILIKE '%débito%'
  );