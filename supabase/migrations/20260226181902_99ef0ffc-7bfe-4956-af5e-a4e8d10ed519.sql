UPDATE auth.users 
SET email = 'fernandaplanetadivertido@gmail.com',
    email_confirmed_at = now()
WHERE id = '7f89aad1-4167-496d-8ab8-85a996a58fea' 
  AND email = 'fernandaplanetadivertid@gmail.com';