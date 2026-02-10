
-- Add "Trabalhe Conosco" unit for Castelo company
INSERT INTO public.company_units (company_id, name, slug, sort_order, is_active)
VALUES ('a0000000-0000-0000-0000-000000000001', 'Trabalhe Conosco', 'trabalhe-conosco', 99, true);

-- Add work_here_response column to wapi_bot_settings
ALTER TABLE public.wapi_bot_settings ADD COLUMN IF NOT EXISTS work_here_response text;
