-- Add DELETE policy for wapi_messages (only admins can delete)
CREATE POLICY "Admins can delete messages"
ON public.wapi_messages
FOR DELETE
USING (is_admin(auth.uid()));

-- Add DELETE policy for wapi_conversations (only admins can delete)
-- Note: The existing "Authenticated users can manage conversations" is for ALL
-- but let's ensure there's an explicit DELETE policy for admins
CREATE POLICY "Admins can delete conversations"
ON public.wapi_conversations
FOR DELETE
USING (is_admin(auth.uid()));