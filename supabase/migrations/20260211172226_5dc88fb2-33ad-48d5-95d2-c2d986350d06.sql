
-- Drop the existing foreign key and re-create with ON DELETE CASCADE
-- This ensures messages are automatically deleted when a conversation is deleted
ALTER TABLE public.wapi_messages
  DROP CONSTRAINT wapi_messages_conversation_id_fkey;

ALTER TABLE public.wapi_messages
  ADD CONSTRAINT wapi_messages_conversation_id_fkey
  FOREIGN KEY (conversation_id) REFERENCES public.wapi_conversations(id)
  ON DELETE CASCADE;

-- Also fix flow_lead_state FK to cascade on conversation delete
ALTER TABLE public.flow_lead_state
  DROP CONSTRAINT flow_lead_state_conversation_id_fkey;

ALTER TABLE public.flow_lead_state
  ADD CONSTRAINT flow_lead_state_conversation_id_fkey
  FOREIGN KEY (conversation_id) REFERENCES public.wapi_conversations(id)
  ON DELETE CASCADE;
