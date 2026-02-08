-- Remove the unique constraint on user_id to allow multiple instances per user (one per unit)
ALTER TABLE public.wapi_instances DROP CONSTRAINT IF EXISTS wapi_instances_user_id_key;

-- Add a unique constraint on user_id + unit instead to ensure one instance per unit per user
ALTER TABLE public.wapi_instances ADD CONSTRAINT wapi_instances_user_id_unit_key UNIQUE (user_id, unit);