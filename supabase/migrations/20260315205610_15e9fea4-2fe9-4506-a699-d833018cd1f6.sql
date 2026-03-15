
CREATE TABLE public.lead_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.campaign_leads(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  data_visita date NOT NULL,
  horario_visita text,
  status_visita text NOT NULL DEFAULT 'agendada',
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

ALTER TABLE public.lead_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view lead visits for their companies"
  ON public.lead_visits FOR SELECT TO authenticated
  USING (company_id IN (SELECT unnest(public.get_user_company_ids(auth.uid()))));

CREATE POLICY "Users can insert lead visits for their companies"
  ON public.lead_visits FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT unnest(public.get_user_company_ids(auth.uid()))));

CREATE POLICY "Users can update lead visits for their companies"
  ON public.lead_visits FOR UPDATE TO authenticated
  USING (company_id IN (SELECT unnest(public.get_user_company_ids(auth.uid()))));

CREATE POLICY "Users can delete lead visits for their companies"
  ON public.lead_visits FOR DELETE TO authenticated
  USING (company_id IN (SELECT unnest(public.get_user_company_ids(auth.uid()))));

CREATE INDEX idx_lead_visits_lead_id ON public.lead_visits(lead_id);
CREATE INDEX idx_lead_visits_company_id ON public.lead_visits(company_id);
