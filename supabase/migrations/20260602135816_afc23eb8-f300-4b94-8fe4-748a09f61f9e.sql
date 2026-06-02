ALTER TABLE public.wapi_bot_questions
  DROP CONSTRAINT IF EXISTS wapi_bot_questions_instance_id_fkey,
  ADD CONSTRAINT wapi_bot_questions_instance_id_fkey
    FOREIGN KEY (instance_id) REFERENCES public.wapi_instances(id) ON DELETE CASCADE;