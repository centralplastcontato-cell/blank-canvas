
-- Add benefits column to company_landing_pages
ALTER TABLE public.company_landing_pages
ADD COLUMN benefits jsonb DEFAULT '{"enabled": true, "title": "", "subtitle": "", "items": [], "trust_badges": []}'::jsonb;
