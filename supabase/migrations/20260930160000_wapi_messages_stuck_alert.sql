-- Alerta de mensagem "travada" (enviada pelo Celebrei mas nunca confirmada como
-- entregue pelo WhatsApp) — normalmente sinal de que a sessão do número caiu bem
-- na hora do envio. stuck_alert_sent_at marca quando já avisamos a equipe, para
-- não notificar a mesma mensagem de novo a cada execução da verificação.

ALTER TABLE public.wapi_messages
  ADD COLUMN IF NOT EXISTS stuck_alert_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_wapi_messages_stuck_check
  ON public.wapi_messages (timestamp)
  WHERE from_me = true AND status = 'sent' AND stuck_alert_sent_at IS NULL;
