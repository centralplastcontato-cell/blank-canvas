update public.whatsapp_outbound_queue
set
  status = 'rejected',
  rejected_at = now(),
  last_error = 'manual_safety_flush_after_reconnect_burst'
where status in ('pending', 'approved');