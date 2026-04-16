UPDATE public.wapi_instances 
SET status = 'connected', connected_at = now(), updated_at = now()
WHERE id IN (
  'ba0a2a17-110e-447d-a22a-f481e21c7894',  -- Aventura Kids
  '9b846163-9580-436b-a33e-1e0eca106514',  -- Vendas 1
  '76060753-8eb9-4324-87e5-72425ca47633'   -- Mega Magic
);