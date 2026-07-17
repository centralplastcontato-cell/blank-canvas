-- Fecha 100% a leitura da company_onboarding pela chave pública.
--
-- O formulário público de onboarding passou a retomar o progresso apenas do
-- rascunho local (localStorage) — não lê mais a tabela pelo banco. Logo, a porta
-- de leitura get_onboarding_draft não é mais necessária e é removida, eliminando
-- também o acesso direcionado (por company_id) que ela ainda permitia.
--
-- Rodar DEPOIS do deploy do front que deixou de chamar essa RPC.
DROP FUNCTION IF EXISTS public.get_onboarding_draft(uuid);
