-- IA Conversacional (beta): horário de atendimento da equipe e alerta forte
-- quando ninguém responde depois que a IA passa a conversa.

-- Mesmo formato do visit_hours, sem o intervalo ("Segunda a sexta, das 09:00
-- às 18:00; sábado, das 09:00 às 13:00"). Vazio = usa o horário de visitas.
ALTER TABLE public.ai_agent_settings ADD COLUMN IF NOT EXISTS team_hours text;
-- Minutos de expediente sem resposta da equipe até o alerta forte
ALTER TABLE public.ai_agent_settings ADD COLUMN IF NOT EXISTS handoff_alert_minutes integer NOT NULL DEFAULT 10;
-- WhatsApp que recebe o alerta forte (ex.: gerente). Vazio = só sininho.
ALTER TABLE public.ai_agent_settings ADD COLUMN IF NOT EXISTS handoff_alert_phone text;
