
CREATE OR REPLACE FUNCTION public.get_party_control_module_status(_event_id uuid)
RETURNS TABLE (
  has_maintenance boolean,
  has_monitoring boolean,
  attendance_guest_count integer,
  has_staff boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (SELECT 1 FROM public.maintenance_entries WHERE event_id = _event_id) AS has_maintenance,
    EXISTS (SELECT 1 FROM public.party_monitoring_entries WHERE event_id = _event_id) AS has_monitoring,
    COALESCE((
      SELECT jsonb_array_length(guests)
      FROM public.attendance_entries
      WHERE event_id = _event_id
      LIMIT 1
    ), 0)::int AS attendance_guest_count,
    EXISTS (SELECT 1 FROM public.event_staff_entries WHERE event_id = _event_id) AS has_staff;
$$;
