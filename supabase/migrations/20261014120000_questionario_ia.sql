-- Questionário da IA: o buffet responde como a IA deve atender (tom, preços,
-- visitas, quando passar para a equipe, exemplos reais). Uma linha por empresa.
-- Enquanto não for enviado, a equipe Celebrei não liga a IA para o buffet.
-- As respostas não mudam a IA sozinhas: servem de base para o ajuste.
CREATE TABLE IF NOT EXISTS public.ai_questionnaires (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'enviado')),
  submitted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_questionnaires ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their company AI questionnaire" ON public.ai_questionnaires;
CREATE POLICY "Users can view their company AI questionnaire"
  ON public.ai_questionnaires FOR SELECT TO authenticated
  USING (company_id IN (SELECT unnest(public.get_user_company_ids(auth.uid()))));

DROP POLICY IF EXISTS "Users can insert their company AI questionnaire" ON public.ai_questionnaires;
CREATE POLICY "Users can insert their company AI questionnaire"
  ON public.ai_questionnaires FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT unnest(public.get_user_company_ids(auth.uid()))));

DROP POLICY IF EXISTS "Users can update their company AI questionnaire" ON public.ai_questionnaires;
CREATE POLICY "Users can update their company AI questionnaire"
  ON public.ai_questionnaires FOR UPDATE TO authenticated
  USING (company_id IN (SELECT unnest(public.get_user_company_ids(auth.uid()))))
  WITH CHECK (company_id IN (SELECT unnest(public.get_user_company_ids(auth.uid()))));
