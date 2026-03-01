
-- Drop anonymous UPDATE policies
DROP POLICY IF EXISTS "Anon can update attendance entry" ON attendance_entries;
DROP POLICY IF EXISTS "Anon can update event info entry" ON event_info_entries;
DROP POLICY IF EXISTS "Anon can update staff entry" ON event_staff_entries;

-- RPC 1: update_attendance_entry_public
CREATE OR REPLACE FUNCTION public.update_attendance_entry_public(
  _entry_id uuid,
  _guests jsonb,
  _notes text DEFAULT NULL,
  _receptionist_name text DEFAULT NULL,
  _event_id uuid DEFAULT NULL,
  _finalized_at timestamptz DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.attendance_entries
  SET
    guests = _guests,
    notes = _notes,
    receptionist_name = _receptionist_name,
    event_id = _event_id,
    finalized_at = _finalized_at
  WHERE id = _entry_id;
END;
$$;

-- RPC 2: update_event_info_entry_public
CREATE OR REPLACE FUNCTION public.update_event_info_entry_public(
  _entry_id uuid,
  _items jsonb,
  _notes text DEFAULT NULL,
  _event_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.event_info_entries
  SET
    items = _items,
    notes = _notes,
    event_id = _event_id
  WHERE id = _entry_id;
END;
$$;

-- RPC 3: update_staff_entry_public
CREATE OR REPLACE FUNCTION public.update_staff_entry_public(
  _entry_id uuid,
  _staff_data jsonb,
  _notes text DEFAULT NULL,
  _event_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.event_staff_entries
  SET
    staff_data = _staff_data,
    notes = _notes,
    event_id = _event_id
  WHERE id = _entry_id;
END;
$$;
