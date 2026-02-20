-- Atualizar domain_canonical e custom_domain do Planeta Divertido
UPDATE companies 
SET 
  custom_domain = 'buffetplanetadivertido.com.br',
  domain_canonical = 'buffetplanetadivertido.com.br',
  updated_at = now()
WHERE id = '6bc204ae-1311-4c67-bb6b-9ab55dae9d11';