
-- 1) notifications: tighten INSERT to require same-company membership (still allows triggers/service_role via bypass)
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "Users can insert notifications in their companies"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (
  company_id = ANY (get_user_company_ids(auth.uid()))
  OR is_admin(auth.uid())
);

-- 2) ai_usage_logs: restrict INSERT to service_role only
DROP POLICY IF EXISTS "Service can insert ai usage logs" ON public.ai_usage_logs;
CREATE POLICY "Service role can insert ai usage logs"
ON public.ai_usage_logs FOR INSERT TO service_role
WITH CHECK (true);

-- 3) event_info_entries: remove public SELECT policy and expose via SECURITY DEFINER RPCs
DROP POLICY IF EXISTS "Anon can view event info entry by id" ON public.event_info_entries;

CREATE OR REPLACE FUNCTION public.get_event_info_entry_public(_id uuid)
RETURNS TABLE (
  id uuid,
  company_id uuid,
  event_id uuid,
  items jsonb,
  notes text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, company_id, event_id, items, notes
  FROM public.event_info_entries
  WHERE id = _id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_event_info_entries_by_event_public(_event_id uuid)
RETURNS TABLE (id uuid, items jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, items
  FROM public.event_info_entries
  WHERE event_id = _event_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_event_info_entry_public(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_event_info_entries_by_event_public(uuid) TO anon, authenticated;

-- 4) freelancer_evaluations: remove blanket anon UPDATE policy and expose write via SECURITY DEFINER RPC
DROP POLICY IF EXISTS "Anon can update evaluations" ON public.freelancer_evaluations;
DROP POLICY IF EXISTS "Anon can insert evaluations" ON public.freelancer_evaluations;

CREATE OR REPLACE FUNCTION public.submit_freelancer_evaluation(
  _entry_id uuid,
  _company_id uuid,
  _event_id uuid,
  _freelancer_name text,
  _scores jsonb,
  _observations text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _existing_id uuid;
  _entry_company uuid;
BEGIN
  -- Validate that the staff entry exists and belongs to the provided company
  SELECT company_id INTO _entry_company
  FROM public.event_staff_entries
  WHERE id = _entry_id;

  IF _entry_company IS NULL OR _entry_company <> _company_id THEN
    RAISE EXCEPTION 'Invalid staff entry';
  END IF;

  SELECT id INTO _existing_id
  FROM public.freelancer_evaluations
  WHERE event_staff_entry_id = _entry_id AND freelancer_name = _freelancer_name;

  IF _existing_id IS NOT NULL THEN
    UPDATE public.freelancer_evaluations
    SET scores = _scores,
        observations = _observations,
        event_id = _event_id
    WHERE id = _existing_id;
    RETURN _existing_id;
  END IF;

  INSERT INTO public.freelancer_evaluations (
    company_id, event_staff_entry_id, event_id, freelancer_name, scores, observations, evaluated_by
  ) VALUES (
    _company_id, _entry_id, _event_id, _freelancer_name, _scores, _observations, NULL
  ) RETURNING id INTO _existing_id;

  RETURN _existing_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_freelancer_evaluation(uuid, uuid, uuid, text, jsonb, text) TO anon, authenticated;

-- 5) storage: restrict whatsapp-media writes to authenticated users (bucket is private)
DROP POLICY IF EXISTS "Service role can upload whatsapp media" ON storage.objects;
DROP POLICY IF EXISTS "Service role can update whatsapp media" ON storage.objects;
