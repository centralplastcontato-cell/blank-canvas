-- Foto de perfil das contas principais dos buffets = logotipo do buffet (22/10).
-- Só onde ainda não tem foto.
UPDATE public.profiles p
SET avatar_url = c.logo_url
FROM public.user_companies uc
JOIN public.companies c ON c.id = uc.company_id
WHERE uc.user_id = p.user_id
  AND c.logo_url IS NOT NULL
  AND p.avatar_url IS NULL
  AND lower(p.email) IN (
    'castelodadiversao@gmail.com',
    'buffetmegamagic@gmail.com',
    'fernandaplanetadivertido@gmail.com'
  );
