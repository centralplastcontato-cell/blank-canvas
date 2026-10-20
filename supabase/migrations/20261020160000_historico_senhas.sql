-- Histórico de Senhas: toda troca de senha fica registrada (Perfil, "Esqueci
-- minha senha", admin). O gatilho garante o registro; a tela completa com
-- quem trocou, por onde e em qual aparelho.
ALTER TABLE public.password_reset_logs
  ADD COLUMN IF NOT EXISTS method text,
  ADD COLUMN IF NOT EXISTS device text;
ALTER TABLE public.password_reset_logs ALTER COLUMN reset_by_user_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.log_password_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    INSERT INTO public.password_reset_logs (target_user_id, target_user_email, target_user_name, method)
    VALUES (NEW.id, NEW.email, (SELECT full_name FROM public.profiles WHERE user_id = NEW.id LIMIT 1), 'sistema');
  EXCEPTION WHEN OTHERS THEN
    NULL; -- o registro nunca pode impedir a troca de senha
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_password_change ON auth.users;
CREATE TRIGGER trg_log_password_change
  AFTER UPDATE OF encrypted_password ON auth.users
  FOR EACH ROW
  WHEN (OLD.encrypted_password IS DISTINCT FROM NEW.encrypted_password)
  EXECUTE FUNCTION public.log_password_change();

-- Chamado pela tela depois de trocar a própria senha
CREATE OR REPLACE FUNCTION public.log_my_password_change(_method text, _device text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _id uuid;
  _name text;
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  SELECT full_name INTO _name FROM public.profiles WHERE user_id = _uid LIMIT 1;
  SELECT id INTO _id FROM public.password_reset_logs
    WHERE target_user_id = _uid AND reset_by_user_id IS NULL AND created_at > now() - interval '5 minutes'
    ORDER BY created_at DESC LIMIT 1;
  IF _id IS NOT NULL THEN
    UPDATE public.password_reset_logs
      SET reset_by_user_id = _uid, reset_by_user_name = _name, method = left(_method, 40), device = left(_device, 120)
      WHERE id = _id;
  ELSE
    INSERT INTO public.password_reset_logs (target_user_id, target_user_email, target_user_name, reset_by_user_id, reset_by_user_name, method, device)
    VALUES (_uid, (SELECT email FROM auth.users WHERE id = _uid), _name, _uid, _name, left(_method, 40), left(_device, 120));
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.log_my_password_change(text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.log_my_password_change(text, text) TO authenticated;
