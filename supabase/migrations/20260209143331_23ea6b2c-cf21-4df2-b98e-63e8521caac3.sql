INSERT INTO public.user_permissions (user_id, permission, granted)
VALUES ('fcb0aba4-cef8-4b94-b8bb-b0b777b81286', 'leads.transfer', true)
ON CONFLICT DO NOTHING;