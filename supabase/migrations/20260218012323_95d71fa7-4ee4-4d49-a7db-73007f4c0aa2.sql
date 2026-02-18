
-- Create freelancer_evaluations table
CREATE TABLE public.freelancer_evaluations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  event_staff_entry_id uuid REFERENCES public.event_staff_entries(id),
  event_id uuid REFERENCES public.company_events(id),
  freelancer_name text NOT NULL,
  freelancer_response_id uuid REFERENCES public.freelancer_responses(id),
  evaluated_by uuid,
  scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  observations text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT unique_evaluation_per_staff_freelancer UNIQUE (event_staff_entry_id, freelancer_name)
);

-- Enable RLS
ALTER TABLE public.freelancer_evaluations ENABLE ROW LEVEL SECURITY;

-- SELECT: company users + admins
CREATE POLICY "Users can view evaluations from their companies"
ON public.freelancer_evaluations FOR SELECT
USING ((company_id = ANY (get_user_company_ids(auth.uid()))) OR is_admin(auth.uid()));

-- INSERT: company users + admins
CREATE POLICY "Users can insert evaluations in their companies"
ON public.freelancer_evaluations FOR INSERT
WITH CHECK ((company_id = ANY (get_user_company_ids(auth.uid()))) OR is_admin(auth.uid()));

-- UPDATE: company users + admins
CREATE POLICY "Users can update evaluations in their companies"
ON public.freelancer_evaluations FOR UPDATE
USING ((company_id = ANY (get_user_company_ids(auth.uid()))) OR is_admin(auth.uid()));

-- DELETE: company admins + super admins
CREATE POLICY "Company admins can delete evaluations"
ON public.freelancer_evaluations FOR DELETE
USING (is_admin(auth.uid()) OR ((company_id = ANY (get_user_company_ids(auth.uid()))) AND (EXISTS (
  SELECT 1 FROM user_companies uc
  WHERE uc.user_id = auth.uid() AND uc.company_id = freelancer_evaluations.company_id
  AND uc.role = ANY (ARRAY['owner'::text, 'admin'::text])
))));
