-- Add optional event and lead linking to tasks
ALTER TABLE public.company_tasks 
ADD COLUMN event_id uuid REFERENCES public.company_events(id) ON DELETE SET NULL,
ADD COLUMN lead_id uuid REFERENCES public.campaign_leads(id) ON DELETE SET NULL;

-- Indexes for fast lookup
CREATE INDEX idx_company_tasks_event_id ON public.company_tasks(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX idx_company_tasks_lead_id ON public.company_tasks(lead_id) WHERE lead_id IS NOT NULL;