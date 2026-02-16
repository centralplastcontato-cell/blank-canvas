
-- Table: event_checklist_items
CREATE TABLE public.event_checklist_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.company_events(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  title text NOT NULL,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  completed_by uuid,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view checklist items from their companies"
  ON public.event_checklist_items FOR SELECT
  USING (company_id = ANY(get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

CREATE POLICY "Users can insert checklist items in their companies"
  ON public.event_checklist_items FOR INSERT
  WITH CHECK (company_id = ANY(get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

CREATE POLICY "Users can update checklist items in their companies"
  ON public.event_checklist_items FOR UPDATE
  USING (company_id = ANY(get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

CREATE POLICY "Users can delete checklist items in their companies"
  ON public.event_checklist_items FOR DELETE
  USING (company_id = ANY(get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

CREATE INDEX idx_checklist_items_event ON public.event_checklist_items(event_id);

-- Table: event_checklist_templates
CREATE TABLE public.event_checklist_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id),
  name text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_checklist_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view templates from their companies"
  ON public.event_checklist_templates FOR SELECT
  USING (company_id = ANY(get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

CREATE POLICY "Company admins can manage templates"
  ON public.event_checklist_templates FOR ALL
  USING (
    is_admin(auth.uid()) OR (
      company_id = ANY(get_user_company_ids(auth.uid())) AND
      EXISTS (
        SELECT 1 FROM user_companies uc
        WHERE uc.user_id = auth.uid()
          AND uc.company_id = event_checklist_templates.company_id
          AND uc.role = ANY(ARRAY['owner','admin'])
      )
    )
  )
  WITH CHECK (
    is_admin(auth.uid()) OR (
      company_id = ANY(get_user_company_ids(auth.uid())) AND
      EXISTS (
        SELECT 1 FROM user_companies uc
        WHERE uc.user_id = auth.uid()
          AND uc.company_id = event_checklist_templates.company_id
          AND uc.role = ANY(ARRAY['owner','admin'])
      )
    )
  );
