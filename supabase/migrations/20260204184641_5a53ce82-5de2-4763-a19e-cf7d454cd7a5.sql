-- Add DELETE policy for wapi_conversations for users with delete permission
CREATE POLICY "Users with delete permission can delete conversations"
ON wapi_conversations
FOR DELETE
USING (
  auth.uid() IS NOT NULL AND (
    is_admin(auth.uid()) OR 
    has_permission(auth.uid(), 'leads.delete.from_chat')
  )
);

-- Add DELETE policy for wapi_messages for users with delete permission  
CREATE POLICY "Users with delete permission can delete messages"
ON wapi_messages
FOR DELETE
USING (
  auth.uid() IS NOT NULL AND (
    is_admin(auth.uid()) OR 
    has_permission(auth.uid(), 'leads.delete.from_chat')
  )
);

-- Add DELETE policy for lead_history for cascade delete
CREATE POLICY "Users with delete permission can delete history"
ON lead_history
FOR DELETE
USING (
  auth.uid() IS NOT NULL AND (
    is_admin(auth.uid()) OR 
    has_permission(auth.uid(), 'leads.delete.from_chat')
  )
);