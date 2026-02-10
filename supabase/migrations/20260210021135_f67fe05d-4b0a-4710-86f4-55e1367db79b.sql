INSERT INTO public.user_companies (user_id, company_id, role, is_default)
VALUES ('0b9cb8a8-87e5-4e54-9994-82b631f223fd', 'a0000000-0000-0000-0000-000000000001', 'owner', false)
ON CONFLICT DO NOTHING;