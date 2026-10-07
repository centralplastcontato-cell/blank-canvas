-- Acompanhamento da Bia (Configurar IA): lembrete de inatividade durante a
-- conversa, follow-ups por etapa (prazo + objetivo; a Bia escreve) e perdido
-- automático, só para as conversas atendidas pela IA. Vazio = padrão do
-- sistema (lembrete em 60 min, etapas em 72h e 288h, perdido 48h depois).
-- Os follow-ups do bot fixo (por número, em wapi_bot_settings) não mudam.
alter table public.ai_agent_settings
  add column if not exists followup_config jsonb;
