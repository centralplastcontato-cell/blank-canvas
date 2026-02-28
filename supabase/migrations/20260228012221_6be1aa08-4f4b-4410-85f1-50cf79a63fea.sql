
ALTER TABLE public.wapi_instances 
ADD COLUMN IF NOT EXISTS last_health_check timestamptz,
ADD COLUMN IF NOT EXISTS auto_recovery_attempts integer DEFAULT 0;
