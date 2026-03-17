
-- ============================================================
-- CELEBREI — Contract Module (Phase 8)
-- Tables: contract_models, contract_model_versions, generated_contracts, lead_contract_data
-- ============================================================

-- 1. Contract Models (templates owned by each buffet)
CREATE TABLE public.contract_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome_modelo text NOT NULL,
  slug text,
  tipo_evento text NOT NULL DEFAULT 'aniversario',
  descricao text,
  conteudo_template text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  versao integer NOT NULL DEFAULT 1,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER contract_models_updated_at
  BEFORE UPDATE ON public.contract_models
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Contract Model Versions (history of each template edit)
CREATE TABLE public.contract_model_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES public.contract_models(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  versao integer NOT NULL,
  conteudo_template text NOT NULL,
  tipo_evento text,
  nome_modelo text,
  changed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Generated Contracts (frozen copies)
CREATE TABLE public.generated_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id uuid REFERENCES public.campaign_leads(id),
  event_id uuid REFERENCES public.company_events(id),
  template_id uuid REFERENCES public.contract_models(id),
  template_version_id uuid REFERENCES public.contract_model_versions(id),
  nome_documento text NOT NULL,
  tipo_evento text,
  conteudo_renderizado text NOT NULL,
  dados_utilizados jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'gerado',
  pdf_url text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER generated_contracts_updated_at
  BEFORE UPDATE ON public.generated_contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Lead contract data (extra fields needed for contracts)
CREATE TABLE public.lead_contract_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.campaign_leads(id) ON DELETE CASCADE UNIQUE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  cpf text,
  rg text,
  email text,
  endereco text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  cep text,
  nome_aniversariante text,
  idade_aniversariante text,
  data_nascimento text,
  nomes_pais text,
  valor_sinal numeric,
  valor_restante numeric,
  forma_pagamento text,
  parcelas text,
  brindes text,
  observacoes_comerciais text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER lead_contract_data_updated_at
  BEFORE UPDATE ON public.lead_contract_data
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE public.contract_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_model_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_contract_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own company contract models"
  ON public.contract_models FOR SELECT TO authenticated
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can insert own company contract models"
  ON public.contract_models FOR INSERT TO authenticated
  WITH CHECK (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can update own company contract models"
  ON public.contract_models FOR UPDATE TO authenticated
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can delete own company contract models"
  ON public.contract_models FOR DELETE TO authenticated
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can view own company versions"
  ON public.contract_model_versions FOR SELECT TO authenticated
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can insert own company versions"
  ON public.contract_model_versions FOR INSERT TO authenticated
  WITH CHECK (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can view own company contracts"
  ON public.generated_contracts FOR SELECT TO authenticated
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can insert own company contracts"
  ON public.generated_contracts FOR INSERT TO authenticated
  WITH CHECK (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can update own company contracts"
  ON public.generated_contracts FOR UPDATE TO authenticated
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can view own company lead contract data"
  ON public.lead_contract_data FOR SELECT TO authenticated
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can insert own company lead contract data"
  ON public.lead_contract_data FOR INSERT TO authenticated
  WITH CHECK (company_id = ANY(public.get_user_company_ids(auth.uid())));

CREATE POLICY "Users can update own company lead contract data"
  ON public.lead_contract_data FOR UPDATE TO authenticated
  USING (company_id = ANY(public.get_user_company_ids(auth.uid())));

-- Indexes
CREATE INDEX idx_contract_models_company ON public.contract_models(company_id);
CREATE INDEX idx_contract_model_versions_model ON public.contract_model_versions(model_id);
CREATE INDEX idx_generated_contracts_company ON public.generated_contracts(company_id);
CREATE INDEX idx_generated_contracts_event ON public.generated_contracts(event_id);
CREATE INDEX idx_generated_contracts_lead ON public.generated_contracts(lead_id);
CREATE INDEX idx_lead_contract_data_lead ON public.lead_contract_data(lead_id);
CREATE INDEX idx_lead_contract_data_company ON public.lead_contract_data(company_id);
