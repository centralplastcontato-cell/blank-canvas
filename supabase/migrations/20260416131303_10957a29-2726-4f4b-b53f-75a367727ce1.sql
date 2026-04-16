UPDATE public.wapi_instances 
SET status = 'connected', connected_at = now(), updated_at = now()
WHERE instance_id = 'LITE-I2660D-A8QLPN';