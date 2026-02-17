
-- Create attendance_entries table for guest check-in lists
CREATE TABLE public.attendance_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  event_id UUID REFERENCES public.company_events(id),
  guests JSONB NOT NULL DEFAULT '[]'::jsonb,
  receptionist_name TEXT,
  notes TEXT,
  filled_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attendance_entries ENABLE ROW LEVEL SECURITY;

-- Anon can view/update (public form access)
CREATE POLICY "Anon can view attendance entry by id"
  ON public.attendance_entries FOR SELECT USING (true);

CREATE POLICY "Anon can update attendance entry"
  ON public.attendance_entries FOR UPDATE USING (true) WITH CHECK (true);

-- Authenticated company users can insert
CREATE POLICY "Users can insert attendance entries in their companies"
  ON public.attendance_entries FOR INSERT
  WITH CHECK ((company_id = ANY (get_user_company_ids(auth.uid()))) OR is_admin(auth.uid()));

-- Authenticated company users can update
CREATE POLICY "Users can update attendance entries in their companies"
  ON public.attendance_entries FOR UPDATE
  USING ((company_id = ANY (get_user_company_ids(auth.uid()))) OR is_admin(auth.uid()));

-- Company admins can delete
CREATE POLICY "Company admins can delete attendance entries"
  ON public.attendance_entries FOR DELETE
  USING (is_admin(auth.uid()) OR ((company_id = ANY (get_user_company_ids(auth.uid()))) AND (EXISTS (
    SELECT 1 FROM user_companies uc
    WHERE uc.user_id = auth.uid() AND uc.company_id = attendance_entries.company_id
    AND uc.role = ANY (ARRAY['owner'::text, 'admin'::text])
  ))));

-- Trigger for updated_at
CREATE TRIGGER update_attendance_entries_updated_at
  BEFORE UPDATE ON public.attendance_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
