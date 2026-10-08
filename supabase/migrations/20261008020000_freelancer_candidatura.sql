-- Candidatura de freelancer: um formulário separado (purpose = 'candidatura')
-- para quem chega se candidatando — o "Cadastro" continua sendo de quem já
-- trabalha. Na aba Candidatos: funil (novo → em conversa → aprovado/recusado),
-- distância até o buffet e a origem (link ou Bia).

ALTER TABLE public.freelancer_templates
  ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'cadastro',
  ADD COLUMN IF NOT EXISTS origin_address text; -- endereço do buffet (para a distância)

DO $$ BEGIN
  ALTER TABLE public.freelancer_templates
    ADD CONSTRAINT freelancer_templates_purpose_check CHECK (purpose IN ('cadastro', 'candidatura'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.freelancer_responses
  ADD COLUMN IF NOT EXISTS candidate_stage text,       -- null = novo; 'conversa' = equipe falando com a pessoa
  ADD COLUMN IF NOT EXISTS distance_km numeric(6, 1),  -- em linha reta até o buffet (calculada no envio)
  ADD COLUMN IF NOT EXISTS bairro text,
  ADD COLUMN IF NOT EXISTS source text;                -- 'link' | 'bia'

-- O formulário público lê o tipo e o endereço do buffet por aqui (as funções
-- antigas continuam iguais)
CREATE OR REPLACE FUNCTION public.get_freelancer_template_extras(_template_id uuid)
RETURNS TABLE(purpose text, origin_address text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT ft.purpose, ft.origin_address
  FROM public.freelancer_templates ft
  WHERE ft.id = _template_id AND ft.is_active = true
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_freelancer_template_extras(uuid) TO anon, authenticated;
