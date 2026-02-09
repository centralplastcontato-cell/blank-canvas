-- =============================================
-- MIGRATE EXISTING DATA TO DEFAULT COMPANY
-- =============================================

-- 1. Create default company "Castelo da Diversão"
INSERT INTO public.companies (id, name, slug, is_active, settings)
VALUES (
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'Castelo da Diversão',
  'castelo-da-diversao',
  true,
  '{"description": "Empresa principal - migrada automaticamente"}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- 2. Update all campaign_leads to use the default company
UPDATE public.campaign_leads
SET company_id = 'a0000000-0000-0000-0000-000000000001'::uuid
WHERE company_id IS NULL;

-- 3. Update all wapi_instances to use the default company
UPDATE public.wapi_instances
SET company_id = 'a0000000-0000-0000-0000-000000000001'::uuid
WHERE company_id IS NULL;

-- 4. Update all wapi_conversations to use the default company
UPDATE public.wapi_conversations
SET company_id = 'a0000000-0000-0000-0000-000000000001'::uuid
WHERE company_id IS NULL;

-- 5. Link all existing users to the default company as 'admin'
INSERT INTO public.user_companies (user_id, company_id, role, is_default)
SELECT 
  p.user_id,
  'a0000000-0000-0000-0000-000000000001'::uuid,
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id AND ur.role = 'admin') 
    THEN 'owner'
    ELSE 'member'
  END,
  true -- Set as default company for all users
FROM public.profiles p
WHERE p.is_active = true
ON CONFLICT (user_id, company_id) DO NOTHING;

-- 6. Now make company_id NOT NULL (after migration)
-- We'll do this in a separate step to ensure data is migrated first
ALTER TABLE public.campaign_leads 
ALTER COLUMN company_id SET NOT NULL;

ALTER TABLE public.wapi_instances 
ALTER COLUMN company_id SET NOT NULL;

ALTER TABLE public.wapi_conversations 
ALTER COLUMN company_id SET NOT NULL;