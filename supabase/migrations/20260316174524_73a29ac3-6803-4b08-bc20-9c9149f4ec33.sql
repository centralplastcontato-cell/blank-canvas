
-- Table: automation_reactivation_settings (per company)
CREATE TABLE public.automation_reactivation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  send_window_start INTEGER NOT NULL DEFAULT 8,
  send_window_end INTEGER NOT NULL DEFAULT 22,
  safety_interval_min_seconds INTEGER NOT NULL DEFAULT 60,
  safety_interval_max_seconds INTEGER NOT NULL DEFAULT 120,
  trigger_three_months_enabled BOOLEAN NOT NULL DEFAULT false,
  trigger_two_months_enabled BOOLEAN NOT NULL DEFAULT true,
  trigger_one_month_enabled BOOLEAN NOT NULL DEFAULT true,
  message_three_months TEXT DEFAULT 'Oi {{primeiro_nome}}! 😊 Faltam poucos meses para {{mes_festa}} e já estamos organizando as festas desse período. Se ainda tiver interesse, posso verificar as opções disponíveis!',
  message_two_months TEXT DEFAULT 'Oi {{primeiro_nome}}! 😊 Estamos começando a organizar as festas de {{mes_festa}}. Se você ainda tiver interesse em fazer a festa com a gente, posso verificar as opções disponíveis.',
  message_one_month TEXT DEFAULT 'Oi {{primeiro_nome}}! Entramos no período das reservas de {{mes_festa}} e algumas datas já estão sendo preenchidas. Se quiser, posso verificar a disponibilidade para sua festa.',
  require_party_date BOOLEAN NOT NULL DEFAULT true,
  require_human_interaction BOOLEAN NOT NULL DEFAULT false,
  eligible_statuses TEXT[] DEFAULT ARRAY['novo','em_contato','orcamento_enviado','aguardando_resposta'],
  exclude_closed BOOLEAN NOT NULL DEFAULT true,
  exclude_lost BOOLEAN NOT NULL DEFAULT true,
  exclude_existing_event BOOLEAN NOT NULL DEFAULT true,
  min_days_without_reply INTEGER NOT NULL DEFAULT 7,
  max_messages_per_lead INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- Table: lead_reactivation_history
CREATE TABLE public.lead_reactivation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.campaign_leads(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.wapi_conversations(id) ON DELETE SET NULL,
  reactivation_type TEXT NOT NULL DEFAULT 'month_proximity',
  reactivation_stage TEXT NOT NULL, -- '3_months_before', '2_months_before', '1_month_before'
  message_sent TEXT,
  sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending','sent','failed','cancelled','blocked'
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reactivation_history_lead ON public.lead_reactivation_history(lead_id);
CREATE INDEX idx_reactivation_history_company ON public.lead_reactivation_history(company_id);
CREATE INDEX idx_reactivation_history_status ON public.lead_reactivation_history(status);
CREATE INDEX idx_reactivation_settings_company ON public.automation_reactivation_settings(company_id);

-- RLS
ALTER TABLE public.automation_reactivation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_reactivation_history ENABLE ROW LEVEL SECURITY;

-- Settings: users with company access can read/write
CREATE POLICY "Users can view their company reactivation settings"
  ON public.automation_reactivation_settings FOR SELECT TO authenticated
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can insert their company reactivation settings"
  ON public.automation_reactivation_settings FOR INSERT TO authenticated
  WITH CHECK (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can update their company reactivation settings"
  ON public.automation_reactivation_settings FOR UPDATE TO authenticated
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

-- History: users with company access can read
CREATE POLICY "Users can view their company reactivation history"
  ON public.lead_reactivation_history FOR SELECT TO authenticated
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can insert reactivation history"
  ON public.lead_reactivation_history FOR INSERT TO authenticated
  WITH CHECK (company_id = ANY(public.get_user_company_ids(auth.uid())));

-- Service role will handle inserts from edge functions, these policies are for frontend reads

-- Updated_at trigger
CREATE TRIGGER update_reactivation_settings_updated_at
  BEFORE UPDATE ON public.automation_reactivation_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reactivation_history_updated_at
  BEFORE UPDATE ON public.lead_reactivation_history
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
