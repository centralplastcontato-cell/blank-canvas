-- "Não enviar mais nada": a equipe liga no menu ⋮ da conversa. O número entra
-- na lista de bloqueio da empresa (a mesma das campanhas) e nada automático
-- sai para ele — follow-ups, IA, bot, reativação, campanhas, confirmações.
-- Falta a regra que deixa a equipe incluir (antes só o gatilho do "sair" incluía).
ALTER TABLE public.campaign_optouts ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'auto';
ALTER TABLE public.campaign_optouts ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();

DROP POLICY IF EXISTS "Users can insert campaign optouts for their companies" ON public.campaign_optouts;
CREATE POLICY "Users can insert campaign optouts for their companies"
  ON public.campaign_optouts FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT unnest(public.get_user_company_ids(auth.uid()))));
