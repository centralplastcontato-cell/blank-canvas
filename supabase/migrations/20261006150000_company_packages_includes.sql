-- "O que inclui" de cada pacote (um item por linha), em Operações → Pacotes.
-- A IA (beta) usa para explicar o que cada pacote tem e comparar os pacotes;
-- os valores continuam vindo só da grade de preços.
ALTER TABLE public.company_packages ADD COLUMN IF NOT EXISTS includes text;
