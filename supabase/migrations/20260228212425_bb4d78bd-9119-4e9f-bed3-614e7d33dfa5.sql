ALTER TABLE freelancer_responses
  ADD COLUMN whatsapp_sent_at timestamptz,
  ADD COLUMN whatsapp_send_error text;