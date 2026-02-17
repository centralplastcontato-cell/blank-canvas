
-- Create maintenance_entries table
CREATE TABLE public.maintenance_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  event_id uuid REFERENCES public.company_events(id),
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  filled_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.maintenance_entries ENABLE ROW LEVEL SECURITY;

-- Anon SELECT/UPDATE (public access by ID)
CREATE POLICY "Anon can view maintenance entry by id"
  ON public.maintenance_entries FOR SELECT TO anon USING (true);

CREATE POLICY "Anon can update maintenance entry"
  ON public.maintenance_entries FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Authenticated users
CREATE POLICY "Users can view maintenance entries from their companies"
  ON public.maintenance_entries FOR SELECT TO authenticated
  USING ((company_id = ANY (get_user_company_ids(auth.uid()))) OR is_admin(auth.uid()));

CREATE POLICY "Users can insert maintenance entries in their companies"
  ON public.maintenance_entries FOR INSERT TO authenticated
  WITH CHECK ((company_id = ANY (get_user_company_ids(auth.uid()))) OR is_admin(auth.uid()));

CREATE POLICY "Users can update maintenance entries in their companies"
  ON public.maintenance_entries FOR UPDATE TO authenticated
  USING ((company_id = ANY (get_user_company_ids(auth.uid()))) OR is_admin(auth.uid()));

CREATE POLICY "Company admins can delete maintenance entries"
  ON public.maintenance_entries FOR DELETE TO authenticated
  USING (is_admin(auth.uid()) OR ((company_id = ANY (get_user_company_ids(auth.uid()))) AND EXISTS (
    SELECT 1 FROM user_companies uc
    WHERE uc.user_id = auth.uid() AND uc.company_id = maintenance_entries.company_id
    AND uc.role = ANY (ARRAY['owner','admin'])
  )));

-- Trigger for updated_at
CREATE TRIGGER update_maintenance_entries_updated_at
  BEFORE UPDATE ON public.maintenance_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
