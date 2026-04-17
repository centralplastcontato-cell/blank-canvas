DO $$
DECLARE
  v_instance_id uuid;
BEGIN
  SELECT wi.id INTO v_instance_id
  FROM wapi_instances wi
  JOIN companies c ON c.id = wi.company_id
  WHERE c.name ILIKE '%mega magic%'
    AND (wi.provider = 'wapi' OR wi.provider IS NULL)
    AND wi.status != 'connected'
  LIMIT 1;

  IF v_instance_id IS NULL THEN
    RAISE NOTICE 'No orphaned W-API instance found for Mega Magic';
    RETURN;
  END IF;

  DELETE FROM wapi_bot_questions WHERE instance_id = v_instance_id;
  DELETE FROM wapi_bot_settings WHERE instance_id = v_instance_id;
  DELETE FROM wapi_instances WHERE id = v_instance_id;

  RAISE NOTICE 'Removed instance % and dependents', v_instance_id;
END $$;