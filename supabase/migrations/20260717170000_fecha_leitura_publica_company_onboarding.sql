-- Fecha o vazamento de leitura pública da company_onboarding.
--
-- Problema: uma policy "SELECT TO anon USING (true)" permitia que a chave anon
-- (pública) listasse TODOS os cadastros de onboarding — contato e dados
-- comerciais dos donos dos buffets. O Advisor não pega isso porque a RLS está
-- habilitada; o problema é a policy permissiva.
--
-- O formulário público de onboarding (src/pages/Onboarding.tsx) já foi migrado
-- para NÃO ler a tabela direto: lê pela RPC abaixo e grava via upsert com id
-- gerado no cliente. Este SQL só deve rodar DEPOIS do deploy desse front.

-- 1) Porta controlada: retorna o rascunho de UMA empresa (por company_id).
--    SECURITY DEFINER = roda com privilégio elevado, sem depender de policy anon.
CREATE OR REPLACE FUNCTION public.get_onboarding_draft(_company_id uuid)
RETURNS SETOF public.company_onboarding
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT *
  FROM public.company_onboarding
  WHERE company_id = _company_id
  ORDER BY created_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_onboarding_draft(uuid) TO anon, authenticated;

-- 2) Remove QUALQUER policy de SELECT com "USING (true)" (a regra frouxa que
--    deixava a chave pública ler tudo). A policy de admin, que restringe por
--    login/empresa (qual != 'true'), NÃO é tocada.
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'company_onboarding'
      AND cmd = 'SELECT'
      AND qual = 'true'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.company_onboarding', pol.policyname);
  END LOOP;
END $$;
