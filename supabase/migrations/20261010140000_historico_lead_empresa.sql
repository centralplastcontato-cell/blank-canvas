-- Histórico do lead sempre com a empresa.
--
-- Registros gravados pelas automações (reativação, confirmação de visita) e pelo
-- quadro de colunas (CRM) saíam sem company_id. Por isso:
--   - não apareciam no histórico do lead (a tela só mostra o da empresa);
--   - as mudanças de status feitas pelo quadro nem eram gravadas (o banco recusa
--     registro sem empresa);
--   - a regra de apagar abria exceção para registro sem empresa (a regra de leitura
--     já impedia na prática; fica igual às outras).
-- Em 10/10/2026 eram 1.485 registros sem empresa.
--
-- 1) Registro novo sem empresa pega a empresa do lead (antes da checagem de
--    permissão, então quem grava continua precisando ser da empresa do lead).
CREATE OR REPLACE FUNCTION public.fn_lead_history_fill_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.company_id IS NULL AND NEW.lead_id IS NOT NULL THEN
    SELECT l.company_id INTO NEW.company_id FROM public.campaign_leads l WHERE l.id = NEW.lead_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lead_history_fill_company ON public.lead_history;
CREATE TRIGGER trg_lead_history_fill_company
BEFORE INSERT ON public.lead_history
FOR EACH ROW
EXECUTE FUNCTION public.fn_lead_history_fill_company();

-- 2) Os antigos sem empresa recebem a empresa do lead (não apaga nada).
UPDATE public.lead_history h
SET company_id = l.company_id
FROM public.campaign_leads l
WHERE l.id = h.lead_id
  AND h.company_id IS NULL;

-- 3) Apagar histórico: só da própria empresa.
DROP POLICY IF EXISTS "Users can delete lead history from their companies" ON public.lead_history;
CREATE POLICY "Users can delete lead history from their companies"
ON public.lead_history
FOR DELETE
USING ((company_id = ANY (public.get_user_company_ids(auth.uid()))) OR public.is_admin(auth.uid()));
