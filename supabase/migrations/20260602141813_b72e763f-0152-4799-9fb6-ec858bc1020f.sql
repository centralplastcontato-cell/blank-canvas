ALTER TABLE public.wapi_conversations
  DROP CONSTRAINT IF EXISTS wapi_conversations_instance_id_fkey,
  ADD CONSTRAINT wapi_conversations_instance_id_fkey
    FOREIGN KEY (instance_id)
    REFERENCES public.wapi_instances(id)
    ON DELETE CASCADE;

ALTER TABLE public.wapi_vip_numbers
  DROP CONSTRAINT IF EXISTS wapi_vip_numbers_instance_id_fkey,
  ADD CONSTRAINT wapi_vip_numbers_instance_id_fkey
    FOREIGN KEY (instance_id)
    REFERENCES public.wapi_instances(id)
    ON DELETE CASCADE;