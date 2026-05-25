UPDATE public.wapi_instances
SET connected_at = now() - interval '2 hours'
WHERE status = 'connected'
  AND connected_at IS NOT NULL
  AND connected_at > now() - interval '60 minutes';