
-- Table: freelancer_schedules (rodada de escala)
CREATE TABLE public.freelancer_schedules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  event_ids uuid[] NOT NULL DEFAULT '{}',
  slug text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: freelancer_availability (respostas dos freelancers)
CREATE TABLE public.freelancer_availability (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id uuid NOT NULL REFERENCES public.freelancer_schedules(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  freelancer_name text NOT NULL,
  freelancer_phone text NOT NULL,
  available_event_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: freelancer_assignments (escalacao final)
CREATE TABLE public.freelancer_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id uuid NOT NULL REFERENCES public.freelancer_schedules(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.company_events(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  freelancer_name text NOT NULL,
  role text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_freelancer_schedules_company ON public.freelancer_schedules(company_id);
CREATE INDEX idx_freelancer_availability_schedule ON public.freelancer_availability(schedule_id);
CREATE INDEX idx_freelancer_assignments_schedule ON public.freelancer_assignments(schedule_id);
CREATE INDEX idx_freelancer_assignments_event ON public.freelancer_assignments(event_id);

-- RLS: freelancer_schedules
ALTER TABLE public.freelancer_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can view active schedules"
  ON public.freelancer_schedules FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can manage schedules in their companies"
  ON public.freelancer_schedules FOR ALL
  USING ((company_id = ANY (get_user_company_ids(auth.uid()))) OR is_admin(auth.uid()))
  WITH CHECK ((company_id = ANY (get_user_company_ids(auth.uid()))) OR is_admin(auth.uid()));

-- RLS: freelancer_availability
ALTER TABLE public.freelancer_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit availability"
  ON public.freelancer_availability FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view availability in their companies"
  ON public.freelancer_availability FOR SELECT
  USING ((company_id = ANY (get_user_company_ids(auth.uid()))) OR is_admin(auth.uid()));

CREATE POLICY "Anon can view availability by schedule"
  ON public.freelancer_availability FOR SELECT
  USING (true);

CREATE POLICY "Company admins can delete availability"
  ON public.freelancer_availability FOR DELETE
  USING ((company_id = ANY (get_user_company_ids(auth.uid()))) OR is_admin(auth.uid()));

-- RLS: freelancer_assignments
ALTER TABLE public.freelancer_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage assignments in their companies"
  ON public.freelancer_assignments FOR ALL
  USING ((company_id = ANY (get_user_company_ids(auth.uid()))) OR is_admin(auth.uid()))
  WITH CHECK ((company_id = ANY (get_user_company_ids(auth.uid()))) OR is_admin(auth.uid()));

-- Trigger for updated_at on freelancer_schedules
CREATE TRIGGER update_freelancer_schedules_updated_at
  BEFORE UPDATE ON public.freelancer_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
