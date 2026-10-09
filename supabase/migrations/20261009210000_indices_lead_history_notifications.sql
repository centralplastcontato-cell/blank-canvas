-- Índices que faltavam: lead_history e notifications eram lidas inteiras a cada
-- consulta (milhões de vezes), o que esgotava o Disk IO do banco. Só cria
-- índices; nenhum dado é alterado.
CREATE INDEX IF NOT EXISTS idx_lead_history_lead_created ON public.lead_history (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_history_action_created ON public.lead_history (action, created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type_read ON public.notifications (type, read);
CREATE INDEX IF NOT EXISTS idx_notifications_company_type_created ON public.notifications (company_id, type, created_at);
ANALYZE public.lead_history;
ANALYZE public.notifications;
