-- IA em mais de um número: cada número extra com a sua data de liberação
-- (a IA só pega os clientes novos daquele número a partir dela).
-- Formato: [{"unit": "VENDAS 2", "activated_at": "2026-10-09T15:00:00Z"}]
ALTER TABLE public.ai_agent_settings
  ADD COLUMN IF NOT EXISTS extra_units jsonb NOT NULL DEFAULT '[]'::jsonb;
