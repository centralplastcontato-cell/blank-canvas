-- Evolution Go como terceiro provedor de WhatsApp (ao lado da W-API e da Z-API).
-- Só amplia a lista de valores aceitos; nenhum número muda de provedor.
ALTER TABLE public.wapi_instances DROP CONSTRAINT IF EXISTS wapi_instances_provider_check;
ALTER TABLE public.wapi_instances
  ADD CONSTRAINT wapi_instances_provider_check CHECK (provider IN ('wapi', 'zapi', 'evolution'));
