
-- Visit confirmation settings (one per company)
CREATE TABLE IF NOT EXISTS public.visit_confirmation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL UNIQUE,
  is_enabled boolean DEFAULT false NOT NULL,
  hours_before_visit integer DEFAULT 24 NOT NULL,
  confirmation_message text DEFAULT 'Olá {{nome}} 😊

Passando para confirmar sua visita ao {{nome_buffet}} no dia {{data_visita}} às {{hora_visita}}.

Pode me responder com:

1️⃣ Confirmo
2️⃣ Preciso remarcar' NOT NULL,
  second_message_enabled boolean DEFAULT false NOT NULL,
  second_message_hours_after integer DEFAULT 6 NOT NULL,
  second_message_text text DEFAULT 'Olá {{nome}} 😊

Só passando para lembrar da sua visita hoje às {{hora_visita}} no {{nome_buffet}}.

Estamos te aguardando! 🎉' NOT NULL,
  send_window_start integer DEFAULT 8 NOT NULL,
  send_window_end integer DEFAULT 22 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.visit_confirmation_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own company visit confirmation settings"
ON public.visit_confirmation_settings
FOR ALL
TO authenticated
USING (company_id = ANY(public.get_user_company_ids(auth.uid())))
WITH CHECK (company_id = ANY(public.get_user_company_ids(auth.uid())));

-- Visit confirmation history
CREATE TABLE IF NOT EXISTS public.visit_confirmation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  message_type text DEFAULT 'first' NOT NULL,
  sent_at timestamptz,
  response_received boolean DEFAULT false NOT NULL,
  response_type text,
  response_at timestamptz,
  status text DEFAULT 'pending' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.visit_confirmation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own company visit confirmation history"
ON public.visit_confirmation_history
FOR ALL
TO authenticated
USING (company_id = ANY(public.get_user_company_ids(auth.uid())))
WITH CHECK (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE INDEX IF NOT EXISTS idx_visit_confirmation_history_visit_id ON public.visit_confirmation_history(visit_id);
CREATE INDEX IF NOT EXISTS idx_visit_confirmation_history_company_id ON public.visit_confirmation_history(company_id);
CREATE INDEX IF NOT EXISTS idx_visit_confirmation_history_status ON public.visit_confirmation_history(status);
