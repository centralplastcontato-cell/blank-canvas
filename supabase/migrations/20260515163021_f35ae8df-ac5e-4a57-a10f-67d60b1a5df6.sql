-- Replace partial unique index with a real UNIQUE CONSTRAINT so PostgREST upsert
-- (.upsert with onConflict: 'conversation_id,message_id') works. Postgres treats
-- NULLs as distinct by default, so rows without message_id are unaffected.
ALTER TABLE public.wapi_messages
  ADD CONSTRAINT wapi_messages_conv_msg_unique UNIQUE (conversation_id, message_id);

DROP INDEX IF EXISTS public.wapi_messages_uniq_msg;