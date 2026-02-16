
-- Tabela de registros de equipe por evento
CREATE TABLE public.event_staff_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.company_events(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  filled_by uuid,
  staff_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.event_staff_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view staff entries from their companies"
  ON public.event_staff_entries FOR SELECT
  USING (company_id = ANY(get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

CREATE POLICY "Users can insert staff entries in their companies"
  ON public.event_staff_entries FOR INSERT
  WITH CHECK (company_id = ANY(get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

CREATE POLICY "Users can update staff entries in their companies"
  ON public.event_staff_entries FOR UPDATE
  USING (company_id = ANY(get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

CREATE POLICY "Company admins can delete staff entries"
  ON public.event_staff_entries FOR DELETE
  USING (
    is_admin(auth.uid()) OR (
      company_id = ANY(get_user_company_ids(auth.uid()))
      AND EXISTS (
        SELECT 1 FROM user_companies uc
        WHERE uc.user_id = auth.uid()
          AND uc.company_id = event_staff_entries.company_id
          AND uc.role = ANY(ARRAY['owner','admin'])
      )
    )
  );

CREATE TRIGGER update_event_staff_entries_updated_at
  BEFORE UPDATE ON public.event_staff_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de templates de funções padrão por empresa
CREATE TABLE public.staff_role_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  roles jsonb NOT NULL DEFAULT '[
    {"title": "Gerente de Festa", "default_quantity": 1},
    {"title": "Garçom", "default_quantity": 2},
    {"title": "Cozinha", "default_quantity": 2},
    {"title": "Monitor", "default_quantity": 7},
    {"title": "Segurança", "default_quantity": 1}
  ]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

ALTER TABLE public.staff_role_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view staff role templates from their companies"
  ON public.staff_role_templates FOR SELECT
  USING (company_id = ANY(get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

CREATE POLICY "Users can insert staff role templates in their companies"
  ON public.staff_role_templates FOR INSERT
  WITH CHECK (company_id = ANY(get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));

CREATE POLICY "Users can update staff role templates in their companies"
  ON public.staff_role_templates FOR UPDATE
  USING (company_id = ANY(get_user_company_ids(auth.uid())) OR is_admin(auth.uid()));
