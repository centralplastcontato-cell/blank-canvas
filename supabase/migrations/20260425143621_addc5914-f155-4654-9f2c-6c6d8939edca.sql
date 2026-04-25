-- Remove parcela fantasma do evento "João 9 anos" (Castelo da Diversão)
-- Criada incorretamente pelo auto-heal por causa da taxa de cartão (R$ 550,51)
DELETE FROM public.event_payment_entries WHERE payment_id = '62e36664-50f2-41fa-9dd4-2d53b842c2ab';
DELETE FROM public.event_payments WHERE id = '62e36664-50f2-41fa-9dd4-2d53b842c2ab' AND event_id = '5db73a2a-ea7a-4caf-b640-aa7158d0671a';