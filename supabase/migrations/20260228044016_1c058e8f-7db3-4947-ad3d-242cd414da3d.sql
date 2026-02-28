ALTER TABLE wapi_instances 
ADD COLUMN IF NOT EXISTS last_restart_attempt timestamptz DEFAULT NULL;