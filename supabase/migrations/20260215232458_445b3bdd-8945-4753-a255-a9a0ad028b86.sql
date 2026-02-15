
-- Create company_events table for party/event calendar
CREATE TABLE public.company_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.campaign_leads(id) ON DELETE SET NULL,
  title text NOT NULL,
  event_date date NOT NULL,
  start_time time,
  end_time time,
  event_type text DEFAULT 'infantil',
  guest_count integer,
  unit text,
  status text NOT NULL DEFAULT 'pendente',
  package_name text,
  total_value numeric,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast calendar queries
CREATE INDEX idx_company_events_date ON public.company_events (company_id, event_date);
CREATE INDEX idx_company_events_status ON public.company_events (company_id, status);

-- Enable RLS
ALTER TABLE public.company_events ENABLE ROW LEVEL SECURITY;

-- RLS policies (same pattern as other company tables)
CREATE POLICY "Users can view events from their companies"
  ON public.company_events FOR SELECT
  USING (company_id = ANY(get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

CREATE POLICY "Users can insert events in their companies"
  ON public.company_events FOR INSERT
  WITH CHECK (company_id = ANY(get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

CREATE POLICY "Users can update events in their companies"
  ON public.company_events FOR UPDATE
  USING (company_id = ANY(get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

CREATE POLICY "Company admins can delete events"
  ON public.company_events FOR DELETE
  USING (
    is_admin(auth.uid()) OR (
      company_id = ANY(get_user_company_ids(auth.uid()))
      AND EXISTS (
        SELECT 1 FROM user_companies uc
        WHERE uc.user_id = auth.uid()
          AND uc.company_id = company_events.company_id
          AND uc.role IN ('owner', 'admin')
      )
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_company_events_updated_at
  BEFORE UPDATE ON public.company_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
