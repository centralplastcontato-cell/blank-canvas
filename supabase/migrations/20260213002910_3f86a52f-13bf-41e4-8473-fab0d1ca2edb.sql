DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT id FROM campaign_leads LOOP
    PERFORM recalculate_lead_score(r.id);
  END LOOP;
END;
$$;