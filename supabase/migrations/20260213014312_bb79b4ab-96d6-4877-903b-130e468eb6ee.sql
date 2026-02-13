
-- Function that fires when lead_intelligence is updated
-- Creates notifications for temperature changes and risk detection
CREATE OR REPLACE FUNCTION public.fn_notify_temperature_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lead_name text;
  v_title text;
  v_message text;
  v_notify boolean := false;
  v_type text := 'temperature_change';
  v_user_record record;
  v_temp_labels jsonb := '{"frio":"❄️ Frio","morno":"🌤️ Morno","quente":"🔥 Quente","pronto":"🎯 Pronto"}'::jsonb;
  v_old_label text;
  v_new_label text;
BEGIN
  -- Only fire on UPDATE (not INSERT)
  IF TG_OP != 'UPDATE' THEN
    RETURN NEW;
  END IF;

  -- Get lead name
  SELECT name INTO v_lead_name FROM public.campaign_leads WHERE id = NEW.lead_id;
  IF v_lead_name IS NULL THEN v_lead_name := 'Lead'; END IF;

  v_old_label := COALESCE(v_temp_labels->>OLD.temperature, OLD.temperature);
  v_new_label := COALESCE(v_temp_labels->>NEW.temperature, NEW.temperature);

  -- Case 1: Temperature went UP (good news)
  IF OLD.temperature != NEW.temperature AND 
     (CASE NEW.temperature WHEN 'pronto' THEN 4 WHEN 'quente' THEN 3 WHEN 'morno' THEN 2 ELSE 1 END) >
     (CASE OLD.temperature WHEN 'pronto' THEN 4 WHEN 'quente' THEN 3 WHEN 'morno' THEN 2 ELSE 1 END) THEN
    v_notify := true;
    v_title := '🔥 Lead esquentou!';
    v_message := v_lead_name || ' subiu de ' || v_old_label || ' para ' || v_new_label;
  END IF;

  -- Case 2: Temperature went DOWN (attention needed)
  IF OLD.temperature != NEW.temperature AND 
     (CASE NEW.temperature WHEN 'pronto' THEN 4 WHEN 'quente' THEN 3 WHEN 'morno' THEN 2 ELSE 1 END) <
     (CASE OLD.temperature WHEN 'pronto' THEN 4 WHEN 'quente' THEN 3 WHEN 'morno' THEN 2 ELSE 1 END) THEN
    v_notify := true;
    v_type := 'temperature_drop';
    v_title := '⚠️ Lead esfriou';
    v_message := v_lead_name || ' caiu de ' || v_old_label || ' para ' || v_new_label;
  END IF;

  -- Case 3: Lead entered risk (abandonment detected, was null before)
  IF (OLD.abandonment_type IS NULL AND NEW.abandonment_type IS NOT NULL) THEN
    v_notify := true;
    v_type := 'lead_at_risk';
    v_title := '🚨 Lead em risco!';
    v_message := v_lead_name || ' entrou em risco (' || REPLACE(NEW.abandonment_type, '_', ' ') || ')';
  END IF;

  -- Case 4: Lead became priority
  IF (OLD.priority_flag = false AND NEW.priority_flag = true) THEN
    v_notify := true;
    v_type := 'lead_priority';
    v_title := '🎯 Novo lead prioritário!';
    v_message := v_lead_name || ' agora é prioridade (Score: ' || NEW.score || ')';
  END IF;

  IF v_notify THEN
    -- Notify all users that have access to this company
    FOR v_user_record IN
      SELECT uc.user_id 
      FROM public.user_companies uc 
      WHERE uc.company_id = NEW.company_id
    LOOP
      INSERT INTO public.notifications (user_id, type, title, message, data)
      VALUES (
        v_user_record.user_id,
        v_type,
        v_title,
        v_message,
        jsonb_build_object(
          'lead_id', NEW.lead_id,
          'lead_name', v_lead_name,
          'old_temperature', OLD.temperature,
          'new_temperature', NEW.temperature,
          'score', NEW.score,
          'abandonment_type', NEW.abandonment_type
        )
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on lead_intelligence updates
DROP TRIGGER IF EXISTS trg_notify_temperature_change ON public.lead_intelligence;
CREATE TRIGGER trg_notify_temperature_change
  AFTER UPDATE ON public.lead_intelligence
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_temperature_change();
