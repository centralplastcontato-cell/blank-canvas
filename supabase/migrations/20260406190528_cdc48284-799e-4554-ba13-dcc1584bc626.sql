
-- Add visit_type column to differentiate between commercial visits and pickup/delivery
ALTER TABLE public.lead_visits 
ADD COLUMN visit_type TEXT NOT NULL DEFAULT 'visita';

-- Add event_id to optionally link to an existing party/event
ALTER TABLE public.lead_visits 
ADD COLUMN event_id UUID REFERENCES public.company_events(id) ON DELETE SET NULL;

-- Add items_description for describing what will be delivered/picked up
ALTER TABLE public.lead_visits 
ADD COLUMN items_description TEXT;

-- Index for filtering by visit_type
CREATE INDEX idx_lead_visits_visit_type ON public.lead_visits(visit_type);

-- Index for event_id lookups
CREATE INDEX idx_lead_visits_event_id ON public.lead_visits(event_id);
