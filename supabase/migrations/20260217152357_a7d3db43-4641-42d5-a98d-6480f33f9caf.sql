
-- Create party_monitoring_entries table (same structure as maintenance_entries)
CREATE TABLE public.party_monitoring_entries (
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
ALTER TABLE public.party_monitoring_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies (identical to maintenance_entries)
CREATE POLICY "Anon can view party monitoring entry by id"
ON public.party_monitoring_entries FOR SELECT USING (true);

CREATE POLICY "Anon can update party monitoring entry"
ON public.party_monitoring_entries FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Users can insert party monitoring entries in their companies"
ON public.party_monitoring_entries FOR INSERT
WITH CHECK ((company_id = ANY (get_user_company_ids(auth.uid()))) OR is_admin(auth.uid()));

CREATE POLICY "Users can view party monitoring entries from their companies"
ON public.party_monitoring_entries FOR SELECT
USING ((company_id = ANY (get_user_company_ids(auth.uid()))) OR is_admin(auth.uid()));

CREATE POLICY "Users can update party monitoring entries in their companies"
ON public.party_monitoring_entries FOR UPDATE
USING ((company_id = ANY (get_user_company_ids(auth.uid()))) OR is_admin(auth.uid()));

CREATE POLICY "Company admins can delete party monitoring entries"
ON public.party_monitoring_entries FOR DELETE
USING (is_admin(auth.uid()) OR ((company_id = ANY (get_user_company_ids(auth.uid()))) AND (EXISTS (
  SELECT 1 FROM user_companies uc
  WHERE uc.user_id = auth.uid() AND uc.company_id = party_monitoring_entries.company_id
  AND uc.role = ANY (ARRAY['owner'::text, 'admin'::text])
))));
