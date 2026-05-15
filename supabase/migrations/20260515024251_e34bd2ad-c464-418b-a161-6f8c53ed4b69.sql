UPDATE public.campaigns c SET
  sent_count = COALESCE((SELECT count(*) FROM public.campaign_recipients WHERE campaign_id = c.id AND status = 'sent'), 0),
  error_count = COALESCE((SELECT count(*) FROM public.campaign_recipients WHERE campaign_id = c.id AND status = 'error'), 0),
  total_recipients = COALESCE((SELECT count(*) FROM public.campaign_recipients WHERE campaign_id = c.id), 0);