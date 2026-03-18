-- Table for contract message configuration per company
CREATE TABLE IF NOT EXISTS public.contract_message_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  message_template text NOT NULL DEFAULT 'Olá {{nome}} 😊

Estamos finalizando o contrato da sua festa no {{empresa}} no dia {{data_festa}}.

Para seguirmos, preciso que você preencha seus dados pessoais no link abaixo:

{{link_formulario_contrato}}

Leva menos de 2 minutos! Qualquer dúvida, estamos por aqui. 🎉',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

ALTER TABLE public.contract_message_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company contract message settings"
  ON public.contract_message_settings FOR SELECT TO authenticated
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can insert own company contract message settings"
  ON public.contract_message_settings FOR INSERT TO authenticated
  WITH CHECK (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can update own company contract message settings"
  ON public.contract_message_settings FOR UPDATE TO authenticated
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE TRIGGER update_contract_message_settings_updated_at
  BEFORE UPDATE ON public.contract_message_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();