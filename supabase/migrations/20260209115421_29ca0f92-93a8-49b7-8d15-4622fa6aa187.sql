
-- 1. Create Hub Celebrei as parent company
INSERT INTO public.companies (id, name, slug, is_active, parent_id)
VALUES ('b0000000-0000-0000-0000-000000000001', 'Hub Celebrei', 'hub-celebrei', true, null);

-- 2. Set Castelo da Diversão as child of Hub Celebrei
UPDATE public.companies 
SET parent_id = 'b0000000-0000-0000-0000-000000000001'
WHERE id = 'a0000000-0000-0000-0000-000000000001';
