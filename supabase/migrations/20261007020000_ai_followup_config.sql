-- Acompanhamento da Bia (Configurar IA → Follow-up): lembrete de inatividade
-- durante a conversa, follow-ups por etapa (prazo + objetivo; a Bia escreve) e
-- perdido automático, só para as conversas atendidas pela IA. Vazio/desligado
-- = as conversas da Bia seguem os follow-ups fixos do número, como antes.
-- Os follow-ups do bot fixo (por número, em wapi_bot_settings) não mudam.
alter table public.ai_agent_settings
  add column if not exists followup_config jsonb;

-- Trava por conversa da jornada da Bia (uma execução por vez, sem envio duplo)
alter table public.wapi_conversations
  add column if not exists ai_journey_claimed_at timestamptz;
