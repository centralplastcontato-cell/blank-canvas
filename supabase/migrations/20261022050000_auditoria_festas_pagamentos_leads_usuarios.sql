-- Auditoria (22/10): passa a anotar o que mais importa vigiar, direto no banco
-- (vale para qualquer tela que mexa nesses dados):
--   - festa criada, alterada (data, horário, valor, pacote, convidados, status) ou apagada
--   - pagamento de festa criado, alterado (valor, vencimento, pago/pendente) ou apagado
--   - lead apagado, ou status que entra/sai de "fechado"/"perdido"
--   - usuário colocado/tirado do buffet, função alterada, permissão dada/retirada
-- Só anota o que uma PESSOA fez (com login). IA, robô e rotinas automáticas
-- não entram, para não encher a lista.

CREATE OR REPLACE FUNCTION public.audit_actor_name(_uid uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT NULLIF(trim(full_name), '') FROM public.profiles WHERE user_id = _uid LIMIT 1),
    (SELECT email FROM auth.users WHERE id = _uid),
    'Desconhecido'
  )
$$;

CREATE OR REPLACE FUNCTION public.audit_write(
  _company_id uuid, _action text, _module text, _entity_type text,
  _entity_id text, _entity_name text, _details jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR _company_id IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO public.activity_logs (
    company_id, user_id, user_name, action, module, entity_type, entity_id, entity_name, details
  ) VALUES (
    _company_id, v_uid, public.audit_actor_name(v_uid), _action, _module, _entity_type,
    _entity_id, _entity_name, _details
  );
EXCEPTION WHEN OTHERS THEN
  -- A auditoria nunca pode impedir a gravação de verdade
  RETURN;
END;
$$;

-- Campos que mudaram: {"campo": {"de": ..., "para": ...}}
CREATE OR REPLACE FUNCTION public.audit_diff(_old jsonb, _new jsonb, _fields text[])
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(jsonb_object_agg(f, jsonb_build_object('de', _old->f, 'para', _new->f)), '{}'::jsonb)
  FROM unnest(_fields) AS f
  WHERE (_old->f) IS DISTINCT FROM (_new->f)
$$;

-- Festas
CREATE OR REPLACE FUNCTION public.audit_company_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_changes jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF TG_OP = 'INSERT' THEN
    PERFORM public.audit_write(NEW.company_id, 'create', 'events', 'event', NEW.id::text, NEW.title,
      jsonb_build_object('data', NEW.event_date, 'valor', NEW.total_value, 'pacote', NEW.package_name));
  ELSIF TG_OP = 'UPDATE' THEN
    v_changes := public.audit_diff(to_jsonb(OLD), to_jsonb(NEW),
      ARRAY['title', 'event_date', 'start_time', 'end_time', 'total_value', 'package_name', 'guest_count', 'status', 'unit']);
    IF v_changes <> '{}'::jsonb THEN
      PERFORM public.audit_write(NEW.company_id,
        CASE WHEN v_changes ? 'status' AND (SELECT count(*) FROM jsonb_object_keys(v_changes)) = 1 THEN 'status_change' ELSE 'update' END,
        'events', 'event', NEW.id::text, NEW.title, jsonb_build_object('alteracoes', v_changes));
    END IF;
  ELSE
    PERFORM public.audit_write(OLD.company_id, 'delete', 'events', 'event', OLD.id::text, OLD.title,
      jsonb_build_object('data', OLD.event_date, 'valor', OLD.total_value));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_company_events ON public.company_events;
CREATE TRIGGER trg_audit_company_events
AFTER INSERT OR UPDATE OR DELETE ON public.company_events
FOR EACH ROW EXECUTE FUNCTION public.audit_company_events();

-- Pagamentos das festas
CREATE OR REPLACE FUNCTION public.audit_event_payments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.event_payments;
  v_title text;
  v_changes jsonb;
  v_action text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  v_row := COALESCE(NEW, OLD);
  SELECT title INTO v_title FROM public.company_events WHERE id = v_row.event_id;
  IF TG_OP = 'INSERT' THEN
    PERFORM public.audit_write(NEW.company_id, 'create', 'financial', 'event_payment', NEW.id::text, v_title,
      jsonb_build_object('tipo', NEW.type, 'valor', NEW.amount, 'vencimento', NEW.due_date, 'status', NEW.status));
  ELSIF TG_OP = 'UPDATE' THEN
    v_changes := public.audit_diff(to_jsonb(OLD), to_jsonb(NEW),
      ARRAY['amount', 'due_date', 'status', 'paid_at', 'payment_method', 'type']);
    IF v_changes <> '{}'::jsonb THEN
      v_action := CASE WHEN NEW.status IS DISTINCT FROM OLD.status AND NEW.paid_at IS NOT NULL THEN 'payment' ELSE 'update' END;
      PERFORM public.audit_write(NEW.company_id, v_action, 'financial', 'event_payment', NEW.id::text, v_title,
        jsonb_build_object('valor', NEW.amount, 'alteracoes', v_changes));
    END IF;
  ELSE
    PERFORM public.audit_write(OLD.company_id, 'delete', 'financial', 'event_payment', OLD.id::text, v_title,
      jsonb_build_object('tipo', OLD.type, 'valor', OLD.amount, 'vencimento', OLD.due_date, 'status', OLD.status));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_event_payments ON public.event_payments;
CREATE TRIGGER trg_audit_event_payments
AFTER INSERT OR UPDATE OR DELETE ON public.event_payments
FOR EACH ROW EXECUTE FUNCTION public.audit_event_payments();

-- Leads: apagado, ou status que entra/sai de fechado/perdido
CREATE OR REPLACE FUNCTION public.audit_campaign_leads()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF TG_OP = 'DELETE' THEN
    PERFORM public.audit_write(OLD.company_id, 'delete', 'crm', 'lead', OLD.id::text, OLD.name,
      jsonb_build_object('whatsapp', OLD.whatsapp, 'status', OLD.status));
  ELSIF NEW.status IS DISTINCT FROM OLD.status
    AND (NEW.status::text IN ('fechado', 'perdido') OR OLD.status::text IN ('fechado', 'perdido')) THEN
    PERFORM public.audit_write(NEW.company_id, 'status_change', 'crm', 'lead', NEW.id::text, NEW.name,
      jsonb_build_object('alteracoes', jsonb_build_object('status', jsonb_build_object('de', OLD.status, 'para', NEW.status))));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_campaign_leads ON public.campaign_leads;
CREATE TRIGGER trg_audit_campaign_leads
AFTER UPDATE OF status OR DELETE ON public.campaign_leads
FOR EACH ROW EXECUTE FUNCTION public.audit_campaign_leads();

-- Usuários do buffet
CREATE OR REPLACE FUNCTION public.audit_user_companies()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF TG_OP = 'INSERT' THEN
    PERFORM public.audit_write(NEW.company_id, 'create', 'users', 'user', NEW.user_id::text,
      public.audit_actor_name(NEW.user_id), jsonb_build_object('funcao', NEW.role));
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      PERFORM public.audit_write(NEW.company_id, 'update', 'users', 'user', NEW.user_id::text,
        public.audit_actor_name(NEW.user_id),
        jsonb_build_object('alteracoes', jsonb_build_object('funcao', jsonb_build_object('de', OLD.role, 'para', NEW.role))));
    END IF;
  ELSE
    PERFORM public.audit_write(OLD.company_id, 'delete', 'users', 'user', OLD.user_id::text,
      public.audit_actor_name(OLD.user_id), jsonb_build_object('funcao', OLD.role));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_user_companies ON public.user_companies;
CREATE TRIGGER trg_audit_user_companies
AFTER INSERT OR UPDATE OR DELETE ON public.user_companies
FOR EACH ROW EXECUTE FUNCTION public.audit_user_companies();

-- Permissões (a tabela não tem empresa: vai para os buffets do usuário)
CREATE OR REPLACE FUNCTION public.audit_user_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row public.user_permissions;
  v_company uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  v_row := COALESCE(NEW, OLD);
  IF TG_OP = 'UPDATE' AND NEW.granted IS NOT DISTINCT FROM OLD.granted THEN
    RETURN NEW;
  END IF;
  -- Usuário recém-criado recebe várias permissões de uma vez: já aparece como "usuário criado"
  FOR v_company IN SELECT company_id FROM public.user_companies
    WHERE user_id = v_row.user_id AND (TG_OP <> 'INSERT' OR created_at < now() - interval '2 minutes') LOOP
    PERFORM public.audit_write(v_company,
      CASE WHEN TG_OP <> 'DELETE' AND NEW.granted THEN 'permission_grant' ELSE 'permission_revoke' END,
      'users', 'permission', v_row.user_id::text, public.audit_actor_name(v_row.user_id),
      jsonb_build_object('permissao', v_row.permission));
  END LOOP;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_user_permissions ON public.user_permissions;
CREATE TRIGGER trg_audit_user_permissions
AFTER INSERT OR UPDATE OR DELETE ON public.user_permissions
FOR EACH ROW EXECUTE FUNCTION public.audit_user_permissions();

REVOKE EXECUTE ON FUNCTION public.audit_write(uuid, text, text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_actor_name(uuid) FROM PUBLIC, anon, authenticated;
