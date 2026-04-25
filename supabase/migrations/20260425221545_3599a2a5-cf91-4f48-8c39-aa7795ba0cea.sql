UPDATE wapi_instances 
SET instance_token = 'GA1W3axTqTB51bP8641qP7Yu6N1Mq9p1p',
    status = 'connected',
    last_health_check = now(),
    updated_at = now()
WHERE instance_id = 'LITE-4IW93E-MGVYDW';