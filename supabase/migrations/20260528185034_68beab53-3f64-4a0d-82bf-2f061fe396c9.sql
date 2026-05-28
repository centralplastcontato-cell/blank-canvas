INSERT INTO public.user_permissions (user_id, permission, granted)
VALUES ('745b62da-a15c-436d-aad9-994982a47263', 'financial.view', false)
ON CONFLICT (user_id, permission) DO UPDATE SET granted = false;