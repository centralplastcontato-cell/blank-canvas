ALTER TABLE public.company_units
ADD COLUMN IF NOT EXISTS is_physical boolean NOT NULL DEFAULT true;

-- Marca canais de venda do WhatsApp (VENDAS X) como não-físicos.
-- Mantém os registros ativos para preservar o sync de permissões
-- whatsapp.instance.* ↔ leads.unit.<slug>, mas tira da Agenda/Financeiro.
UPDATE public.company_units
SET is_physical = false
WHERE name ~* '^vendas[ _-]*[0-9]+$';