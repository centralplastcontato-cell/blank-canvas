-- Modo de Teste da IA, separado do Modo de Teste do bot fixo.
--
-- O "Modo de Teste" existente (wapi_bot_settings) restringe TODO o número
-- (bot fixo + IA) a um único telefone — desligar a automação para clientes
-- de verdade enquanto testa não é aceitável quando o número já está em uso.
-- Estes campos deixam testar só a IA, com um número específico, sem tocar
-- no que já acontece com o bot fixo para todo mundo.

ALTER TABLE public.ai_agent_settings
  ADD COLUMN IF NOT EXISTS test_mode_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS test_mode_number text;
