
CREATE OR REPLACE FUNCTION public.reset_company_data(_company_id uuid, _delete_conversations boolean DEFAULT false, _delete_leads boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET statement_timeout TO '120s'
AS $function$
DECLARE
  v_deleted_messages integer := 0;
  v_deleted_conversations integer := 0;
  v_deleted_leads integer := 0;
  v_deleted_notifications integer := 0;
  v_deleted_intelligence integer := 0;
  v_deleted_history integer := 0;
  v_deleted_flow_state integer := 0;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores globais podem executar esta ação.';
  END IF;

  IF _delete_conversations THEN
    DELETE FROM public.flow_lead_state
    WHERE conversation_id IN (
      SELECT id FROM public.wapi_conversations WHERE company_id = _company_id
    );
    GET DIAGNOSTICS v_deleted_flow_state = ROW_COUNT;

    DELETE FROM public.wapi_messages
    WHERE conversation_id IN (
      SELECT id FROM public.wapi_conversations WHERE company_id = _company_id
    );
    GET DIAGNOSTICS v_deleted_messages = ROW_COUNT;

    DELETE FROM public.wapi_conversations WHERE company_id = _company_id;
    GET DIAGNOSTICS v_deleted_conversations = ROW_COUNT;
  END IF;

  IF _delete_leads THEN
    DELETE FROM public.lead_intelligence WHERE company_id = _company_id;
    GET DIAGNOSTICS v_deleted_intelligence = ROW_COUNT;

    DELETE FROM public.lead_history
    WHERE lead_id IN (
      SELECT id FROM public.campaign_leads WHERE company_id = _company_id
    );
    GET DIAGNOSTICS v_deleted_history = ROW_COUNT;

    DELETE FROM public.lead_score_snapshots WHERE company_id = _company_id;

    DELETE FROM public.notifications WHERE company_id = _company_id;
    GET DIAGNOSTICS v_deleted_notifications = ROW_COUNT;

    DELETE FROM public.campaign_leads WHERE company_id = _company_id;
    GET DIAGNOSTICS v_deleted_leads = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'deleted_messages', v_deleted_messages,
    'deleted_conversations', v_deleted_conversations,
    'deleted_leads', v_deleted_leads,
    'deleted_notifications', v_deleted_notifications,
    'deleted_intelligence', v_deleted_intelligence,
    'deleted_history', v_deleted_history,
    'deleted_flow_state', v_deleted_flow_state
  );
END;
$function$;
