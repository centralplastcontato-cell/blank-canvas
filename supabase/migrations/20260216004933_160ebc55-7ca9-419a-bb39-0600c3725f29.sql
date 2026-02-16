-- Add color column to company_units
ALTER TABLE public.company_units ADD COLUMN color text DEFAULT '#3b82f6';

-- Set existing units with distinct colors
UPDATE public.company_units SET color = '#3b82f6' WHERE slug = 'manchester';
UPDATE public.company_units SET color = '#f59e0b' WHERE slug = 'trujillo';