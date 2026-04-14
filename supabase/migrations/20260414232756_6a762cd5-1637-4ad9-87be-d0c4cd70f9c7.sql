
ALTER TABLE public.company_packages
  ADD COLUMN valor_adicional_antecipado numeric NULL,
  ADD COLUMN valor_adicional_no_dia numeric NULL;

ALTER TABLE public.company_events
  ADD COLUMN extra_guest_value_antecipado numeric NULL,
  ADD COLUMN extra_guest_value_no_dia numeric NULL;
