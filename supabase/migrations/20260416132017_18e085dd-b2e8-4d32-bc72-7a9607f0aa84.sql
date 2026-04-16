UPDATE public.wapi_instances 
SET status = 'connected', connected_at = now(), updated_at = now()
WHERE id = 'ac422826-d1a9-40a6-8ce2-acc5a0c1cb64';