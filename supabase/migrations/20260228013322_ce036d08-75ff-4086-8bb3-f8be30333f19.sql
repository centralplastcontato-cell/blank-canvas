-- Restore all instances to connected status (they are connected in W-API)
UPDATE wapi_instances 
SET status = 'connected', connected_at = now(), auto_recovery_attempts = 0
WHERE id IN (
  'ba0a2a17-110e-447d-a22a-f481e21c7894',
  '9b846163-9580-436b-a33e-1e0eca106514', 
  'ac422826-d1a9-40a6-8ce2-acc5a0c1cb64',
  '3f39419e-e7f5-4c3b-8ebd-1703e6c7a0c7'
);