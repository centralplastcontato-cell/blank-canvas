
-- Create table for event info entries (text blocks from admin to manager)
CREATE TABLE public.event_info_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  event_id UUID REFERENCES public.company_events(id),
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  filled_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_info_entries ENABLE ROW LEVEL SECURITY;

-- Anon can view by id (for public page)
CREATE POLICY "Anon can view event info entry by id"
ON public.event_info_entries FOR SELECT
USING (true);

-- Anon can update (for public page if needed)
CREATE POLICY "Anon can update event info entry"
ON public.event_info_entries FOR UPDATE
USING (true)
WITH CHECK (true);

-- Users can insert in their companies
CREATE POLICY "Users can insert event info entries in their companies"
ON public.event_info_entries FOR INSERT
WITH CHECK ((company_id = ANY (get_user_company_ids(auth.uid()))) OR is_admin(auth.uid()));

-- Users can update in their companies
CREATE POLICY "Users can update event info entries in their companies"
ON public.event_info_entries FOR UPDATE
USING ((company_id = ANY (get_user_company_ids(auth.uid()))) OR is_admin(auth.uid()));

-- Company admins can delete
CREATE POLICY "Company admins can delete event info entries"
ON public.event_info_entries FOR DELETE
USING (is_admin(auth.uid()) OR ((company_id = ANY (get_user_company_ids(auth.uid()))) AND (EXISTS (
  SELECT 1 FROM user_companies uc
  WHERE uc.user_id = auth.uid() AND uc.company_id = event_info_entries.company_id
  AND uc.role = ANY (ARRAY['owner'::text, 'admin'::text])
))));

-- Trigger for updated_at
CREATE TRIGGER update_event_info_entries_updated_at
BEFORE UPDATE ON public.event_info_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
