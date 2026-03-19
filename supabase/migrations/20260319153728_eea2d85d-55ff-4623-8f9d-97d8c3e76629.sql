
ALTER TABLE public.company_packages
  ADD COLUMN IF NOT EXISTS preco_separado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS valor_pessoa_adicional_crianca numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS valor_pessoa_adicional_adulto numeric DEFAULT NULL;
