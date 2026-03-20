ALTER TABLE public.company_events
  ADD COLUMN child_name text,
  ADD COLUMN child_age text,
  ADD COLUMN child_birthdate date,
  ADD COLUMN parent_names text,
  ADD COLUMN gifts text,
  ADD COLUMN extra_guest_value numeric;