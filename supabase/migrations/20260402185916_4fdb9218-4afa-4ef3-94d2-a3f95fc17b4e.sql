ALTER TABLE public.company_events
ADD COLUMN birthday_children JSONB DEFAULT '[]'::jsonb;