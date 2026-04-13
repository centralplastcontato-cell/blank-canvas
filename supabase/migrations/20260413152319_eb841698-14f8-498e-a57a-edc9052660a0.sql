CREATE TABLE public.form_automation_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  form_type TEXT NOT NULL CHECK (form_type IN ('prefesta', 'cardapio', 'avaliacao')),
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  send_days_before INTEGER NOT NULL DEFAULT 7,
  send_hour INTEGER NOT NULL DEFAULT 10,
  send_minute INTEGER NOT NULL DEFAULT 0,
  message_template TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, form_type)
);

ALTER TABLE public.form_automation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view form automation settings for their companies"
  ON public.form_automation_settings FOR SELECT TO authenticated
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can manage form automation settings for their companies"
  ON public.form_automation_settings FOR ALL TO authenticated
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())))
  WITH CHECK (company_id = ANY(public.get_user_company_ids(auth.uid())));
