-- Criar tabela para armazenar leads capturados
CREATE TABLE public.campaign_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  month TEXT,
  day_preference TEXT,
  guests TEXT,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.campaign_leads ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserção pública (leads vêm de visitantes não autenticados)
CREATE POLICY "Permitir inserção pública de leads"
ON public.campaign_leads
FOR INSERT
WITH CHECK (true);

-- Política para consulta apenas por usuários autenticados (equipe comercial)
CREATE POLICY "Apenas usuários autenticados podem ver leads"
ON public.campaign_leads
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Criar índice para buscas por campanha
CREATE INDEX idx_campaign_leads_campaign_id ON public.campaign_leads(campaign_id);

-- Criar índice para ordenação por data
CREATE INDEX idx_campaign_leads_created_at ON public.campaign_leads(created_at DESC);