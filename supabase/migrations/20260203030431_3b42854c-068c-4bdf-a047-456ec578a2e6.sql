-- Drop existing restrictive RLS policies on wapi_conversations
DROP POLICY IF EXISTS "Users can view own conversations" ON public.wapi_conversations;
DROP POLICY IF EXISTS "Users can insert own conversations" ON public.wapi_conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON public.wapi_conversations;

-- Drop existing restrictive RLS policies on wapi_messages  
DROP POLICY IF EXISTS "Users can view own messages" ON public.wapi_messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON public.wapi_messages;

-- Create new RLS policies for wapi_conversations based on unit permissions
CREATE POLICY "Users can view conversations for permitted units" 
ON public.wapi_conversations 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    is_admin(auth.uid()) OR
    instance_id IN (
      SELECT id FROM public.wapi_instances 
      WHERE is_admin(auth.uid()) 
         OR has_permission(auth.uid(), 'leads.unit.' || lower(unit))
         OR has_permission(auth.uid(), 'leads.unit.all')
    )
  )
);

CREATE POLICY "Service role can insert conversations" 
ON public.wapi_conversations 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can update conversations for permitted units" 
ON public.wapi_conversations 
FOR UPDATE 
USING (
  auth.uid() IS NOT NULL AND (
    is_admin(auth.uid()) OR
    instance_id IN (
      SELECT id FROM public.wapi_instances 
      WHERE is_admin(auth.uid()) 
         OR has_permission(auth.uid(), 'leads.unit.' || lower(unit))
         OR has_permission(auth.uid(), 'leads.unit.all')
    )
  )
);

-- Create new RLS policies for wapi_messages based on unit permissions
CREATE POLICY "Users can view messages for permitted units" 
ON public.wapi_messages 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    is_admin(auth.uid()) OR
    conversation_id IN (
      SELECT c.id FROM public.wapi_conversations c
      JOIN public.wapi_instances i ON i.id = c.instance_id
      WHERE is_admin(auth.uid()) 
         OR has_permission(auth.uid(), 'leads.unit.' || lower(i.unit))
         OR has_permission(auth.uid(), 'leads.unit.all')
    )
  )
);

CREATE POLICY "Service role can insert messages" 
ON public.wapi_messages 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can insert messages" 
ON public.wapi_messages 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND
  conversation_id IN (
    SELECT c.id FROM public.wapi_conversations c
    JOIN public.wapi_instances i ON i.id = c.instance_id
    WHERE is_admin(auth.uid()) 
       OR has_permission(auth.uid(), 'leads.unit.' || lower(i.unit))
       OR has_permission(auth.uid(), 'leads.unit.all')
  )
);