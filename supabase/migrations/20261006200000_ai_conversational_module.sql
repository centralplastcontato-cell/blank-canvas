-- Módulo "IA Conversacional (atendimento no WhatsApp)" por empresa.
-- Fica em companies.settings.enabled_modules.ia_conversacional e só o Hub
-- (administrador da plataforma) liga ou desliga. Com o módulo desligado:
--   * ai_agent_settings.enabled não pode ficar true (nem pela tela, nem pela API);
--   * desligar o módulo desliga a IA da empresa na hora.
-- A função da IA (wapi-webhook) também confere o módulo antes de responder.

CREATE OR REPLACE FUNCTION public.ai_conversational_enabled(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT (settings -> 'enabled_modules' ->> 'ia_conversacional') = 'true'
    FROM public.companies WHERE id = _company_id
  ), false);
$$;

-- Só administrador da plataforma (ou o próprio servidor) mexe no módulo
CREATE OR REPLACE FUNCTION public.protect_ai_conversational_module()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_flag jsonb := CASE WHEN TG_OP = 'UPDATE' THEN OLD.settings -> 'enabled_modules' -> 'ia_conversacional' END;
  new_flag jsonb := NEW.settings -> 'enabled_modules' -> 'ia_conversacional';
BEGIN
  IF new_flag IS NOT DISTINCT FROM old_flag THEN
    RETURN NEW;
  END IF;
  IF auth.uid() IS NULL OR public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  -- Usuário da empresa tentando mudar o módulo: mantém o valor anterior
  IF NEW.settings IS NOT NULL AND jsonb_typeof(NEW.settings -> 'enabled_modules') = 'object' THEN
    IF old_flag IS NULL THEN
      NEW.settings := NEW.settings #- '{enabled_modules,ia_conversacional}';
    ELSE
      NEW.settings := jsonb_set(NEW.settings, '{enabled_modules,ia_conversacional}', old_flag);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_ai_conversational_module ON public.companies;
CREATE TRIGGER protect_ai_conversational_module
  BEFORE INSERT OR UPDATE OF settings ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.protect_ai_conversational_module();

-- Desligou o módulo: a IA da empresa desliga junto
CREATE OR REPLACE FUNCTION public.disable_ai_agent_when_module_off()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.settings -> 'enabled_modules' ->> 'ia_conversacional') IS DISTINCT FROM 'true' THEN
    UPDATE public.ai_agent_settings SET enabled = false, updated_at = now()
    WHERE company_id = NEW.id AND enabled;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS disable_ai_agent_when_module_off ON public.companies;
CREATE TRIGGER disable_ai_agent_when_module_off
  AFTER UPDATE OF settings ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.disable_ai_agent_when_module_off();

-- Ligar a IA exige o módulo
CREATE OR REPLACE FUNCTION public.require_ai_conversational_module()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.enabled AND NOT public.ai_conversational_enabled(NEW.company_id) THEN
    RAISE EXCEPTION 'O módulo IA Conversacional não está liberado para esta empresa'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS require_ai_conversational_module ON public.ai_agent_settings;
CREATE TRIGGER require_ai_conversational_module
  BEFORE INSERT OR UPDATE ON public.ai_agent_settings
  FOR EACH ROW EXECUTE FUNCTION public.require_ai_conversational_module();

-- Hoje: ligado só para o Castelo da Diversão
UPDATE public.companies
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{enabled_modules}',
  COALESCE(settings -> 'enabled_modules', '{}'::jsonb) || '{"ia_conversacional": true}'::jsonb
)
WHERE id = 'a0000000-0000-0000-0000-000000000001';

-- Qualquer outra empresa com a IA ligada é desligada
UPDATE public.ai_agent_settings SET enabled = false, updated_at = now()
WHERE enabled AND NOT public.ai_conversational_enabled(company_id);
