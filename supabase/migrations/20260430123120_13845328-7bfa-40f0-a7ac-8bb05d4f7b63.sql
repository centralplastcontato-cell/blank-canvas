-- Limpa dependências e remove o usuário do auth
DELETE FROM public.user_roles WHERE user_id = 'e2d6cec7-090f-47d7-a496-537930e61012';
DELETE FROM public.user_companies WHERE user_id = 'e2d6cec7-090f-47d7-a496-537930e61012';
DELETE FROM public.profiles WHERE user_id = 'e2d6cec7-090f-47d7-a496-537930e61012';
DELETE FROM auth.users WHERE id = 'e2d6cec7-090f-47d7-a496-537930e61012';