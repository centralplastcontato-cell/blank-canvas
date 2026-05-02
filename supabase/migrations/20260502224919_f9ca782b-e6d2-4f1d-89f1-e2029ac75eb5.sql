
-- =====================================================================
-- PUBLIC PORTAL RPCs (replace anon table access with SECURITY DEFINER)
-- =====================================================================

-- ── Party monitoring ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_party_monitoring_entry_public(_entry_id uuid)
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
  FROM public.party_monitoring_entries
  WHERE id = _entry_id;
$$;

CREATE OR REPLACE FUNCTION public.update_party_monitoring_entry_public(
  _entry_id uuid,
  _items jsonb,
  _notes text DEFAULT NULL,
  _event_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.party_monitoring_entries
  SET items = _items,
      notes = _notes,
      event_id = COALESCE(_event_id, event_id),
      updated_at = now()
  WHERE id = _entry_id;
  RETURN FOUND;
END;
$$;

-- Drop anon policies on party_monitoring_entries
DROP POLICY IF EXISTS "Anon can view party monitoring entry by id" ON public.party_monitoring_entries;
DROP POLICY IF EXISTS "Anon can update party monitoring entry" ON public.party_monitoring_entries;

-- ── Maintenance ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_maintenance_entry_public(_entry_id uuid)
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
  FROM public.maintenance_entries
  WHERE id = _entry_id;
$$;

CREATE OR REPLACE FUNCTION public.update_maintenance_entry_public(
  _entry_id uuid,
  _items jsonb,
  _notes text DEFAULT NULL,
  _event_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.maintenance_entries
  SET items = _items,
      notes = _notes,
      event_id = COALESCE(_event_id, event_id),
      updated_at = now()
  WHERE id = _entry_id;
  RETURN FOUND;
END;
$$;

DROP POLICY IF EXISTS "Anon can view maintenance entry by id" ON public.maintenance_entries;
DROP POLICY IF EXISTS "Anon can update maintenance entry" ON public.maintenance_entries;

-- ── Attendance ──────────────────────────────────────────────────────
-- Reading attendance entry (used by PublicAttendance and PublicAttendanceReview)
CREATE OR REPLACE FUNCTION public.get_attendance_entry_public(_entry_id uuid)
RETURNS TABLE (
  id uuid,
  company_id uuid,
  event_id uuid,
  guests jsonb,
  receptionist_name text,
  notes text,
  finalized_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, company_id, event_id, guests, receptionist_name, notes, finalized_at
  FROM public.attendance_entries
  WHERE id = _entry_id;
$$;

DROP POLICY IF EXISTS "Anon can view attendance entry by id" ON public.attendance_entries;
-- (UPDATE was already via update_attendance_entry_public RPC, no anon UPDATE policy to drop)

-- ── Freelancer schedules / availability ─────────────────────────────
CREATE OR REPLACE FUNCTION public.get_freelancer_schedule_public(
  _schedule_id uuid DEFAULT NULL,
  _company_id uuid DEFAULT NULL,
  _slug text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  start_date date,
  end_date date,
  event_ids uuid[],
  company_id uuid,
  is_active boolean,
  event_display_names jsonb,
  notes text,
  event_notes jsonb,
  slug text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT fs.id, fs.title, fs.start_date, fs.end_date, fs.event_ids, fs.company_id,
         fs.is_active, fs.event_display_names, fs.notes, fs.event_notes, fs.slug
  FROM public.freelancer_schedules fs
  WHERE fs.is_active = true
    AND (
      (_schedule_id IS NOT NULL AND fs.id = _schedule_id)
      OR (_company_id IS NOT NULL AND _slug IS NOT NULL AND fs.company_id = _company_id AND fs.slug = _slug)
    )
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.submit_freelancer_availability_public(
  _schedule_id uuid,
  _freelancer_name text,
  _freelancer_phone text,
  _available_event_ids uuid[]
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  -- Validate schedule exists and is active
  SELECT company_id INTO v_company_id
  FROM public.freelancer_schedules
  WHERE id = _schedule_id AND is_active = true;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Schedule not found or inactive';
  END IF;

  INSERT INTO public.freelancer_availability (
    schedule_id, company_id, freelancer_name, freelancer_phone, available_event_ids
  ) VALUES (
    _schedule_id, v_company_id, trim(_freelancer_name), trim(_freelancer_phone), _available_event_ids
  );

  RETURN true;
END;
$$;

DROP POLICY IF EXISTS "Anon can view active schedules" ON public.freelancer_schedules;
DROP POLICY IF EXISTS "Anon can view availability by active schedule" ON public.freelancer_availability;
-- Drop public INSERT on freelancer_availability if it exists (replaced by RPC)
DROP POLICY IF EXISTS "Anon can insert freelancer availability" ON public.freelancer_availability;
DROP POLICY IF EXISTS "Public can insert freelancer availability" ON public.freelancer_availability;

-- =====================================================================
-- Restrict service-only INSERT/UPDATE policies to {service_role}
-- =====================================================================

-- lead_score_snapshots
DROP POLICY IF EXISTS "System can insert snapshots" ON public.lead_score_snapshots;
CREATE POLICY "Service role can insert snapshots"
  ON public.lead_score_snapshots
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- daily_summaries
DROP POLICY IF EXISTS "Service can upsert daily summaries" ON public.daily_summaries;
DROP POLICY IF EXISTS "Service can update daily summaries" ON public.daily_summaries;
CREATE POLICY "Service role can insert daily summaries"
  ON public.daily_summaries
  FOR INSERT
  TO service_role
  WITH CHECK (true);
CREATE POLICY "Service role can update daily summaries"
  ON public.daily_summaries
  FOR UPDATE
  TO service_role
  USING (true);

-- password_reset_logs
DROP POLICY IF EXISTS "Service can insert password reset logs" ON public.password_reset_logs;
CREATE POLICY "Service role can insert password reset logs"
  ON public.password_reset_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- =====================================================================
-- Contract signatures: clear OTP after successful sign
-- =====================================================================
CREATE OR REPLACE FUNCTION public.clear_contract_otp_after_sign()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'signed' AND NEW.otp_code IS NOT NULL THEN
    NEW.otp_code := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clear_otp_on_sign ON public.contract_signatures;
CREATE TRIGGER clear_otp_on_sign
  BEFORE INSERT OR UPDATE ON public.contract_signatures
  FOR EACH ROW
  EXECUTE FUNCTION public.clear_contract_otp_after_sign();

-- Clear any existing OTP codes on already-signed contracts
UPDATE public.contract_signatures
  SET otp_code = NULL
  WHERE status = 'signed' AND otp_code IS NOT NULL;
