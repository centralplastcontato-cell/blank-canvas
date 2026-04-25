UPDATE wapi_instances 
SET status = 'disconnected',
    updated_at = now()
WHERE instance_id = 'LITE-4IW93E-MGVYDW';