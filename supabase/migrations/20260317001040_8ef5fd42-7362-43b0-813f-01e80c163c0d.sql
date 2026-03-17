
ALTER TABLE public.lead_visits 
ADD COLUMN IF NOT EXISTS responsavel_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lead_visits_data_visita ON public.lead_visits(data_visita);
CREATE INDEX IF NOT EXISTS idx_lead_visits_status ON public.lead_visits(status_visita);
