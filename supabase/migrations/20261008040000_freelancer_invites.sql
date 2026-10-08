-- Link curto do cadastro de candidatos que a Bia manda no WhatsApp
-- (www.buffet.com.br/trabalhe/k7m2qx): o código guarda nome, WhatsApp e
-- funções e a página abre o formulário já preenchido.
CREATE TABLE IF NOT EXISTS public.freelancer_invites (
  code text PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.freelancer_templates(id) ON DELETE CASCADE,
  name text,
  phone text,
  roles text,
  source text NOT NULL DEFAULT 'bia',
  conversation_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Só o servidor (Bia) grava e lê a tabela; a página usa a função abaixo
ALTER TABLE public.freelancer_invites ENABLE ROW LEVEL SECURITY;

-- Código → formulário (+ dados para preencher, por 60 dias)
CREATE OR REPLACE FUNCTION public.get_freelancer_invite(_code text)
RETURNS TABLE(company_slug text, template_slug text, template_id uuid, name text, phone text, roles text, source text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT c.slug, t.slug, t.id,
    CASE WHEN i.created_at > now() - interval '60 days' THEN i.name END,
    CASE WHEN i.created_at > now() - interval '60 days' THEN i.phone END,
    CASE WHEN i.created_at > now() - interval '60 days' THEN i.roles END,
    i.source
  FROM public.freelancer_invites i
  JOIN public.freelancer_templates t ON t.id = i.template_id
  JOIN public.companies c ON c.id = i.company_id
  WHERE i.code = lower(trim(_code))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_freelancer_invite(text) TO anon, authenticated;
