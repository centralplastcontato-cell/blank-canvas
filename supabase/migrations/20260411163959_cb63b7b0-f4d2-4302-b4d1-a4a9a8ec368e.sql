
DO $$
DECLARE
  v_cid uuid := '84f6a011-a1e1-4a2a-96f6-38da92a319ce';
BEGIN
  -- 1) Flow state linked to conversations
  DELETE FROM public.flow_lead_state
  WHERE conversation_id IN (
    SELECT id FROM public.wapi_conversations WHERE company_id = v_cid
  );

  -- 2) Messages
  DELETE FROM public.wapi_messages
  WHERE conversation_id IN (
    SELECT id FROM public.wapi_conversations WHERE company_id = v_cid
  );

  -- 3) Conversations
  DELETE FROM public.wapi_conversations WHERE company_id = v_cid;

  -- 4) Lead intelligence
  DELETE FROM public.lead_intelligence WHERE company_id = v_cid;

  -- 5) Lead history
  DELETE FROM public.lead_history
  WHERE lead_id IN (
    SELECT id FROM public.campaign_leads WHERE company_id = v_cid
  );

  -- 6) Lead score snapshots
  DELETE FROM public.lead_score_snapshots WHERE company_id = v_cid;

  -- 7) Notifications
  DELETE FROM public.notifications WHERE company_id = v_cid;

  -- 8) Leads
  DELETE FROM public.campaign_leads WHERE company_id = v_cid;
END;
$$;
