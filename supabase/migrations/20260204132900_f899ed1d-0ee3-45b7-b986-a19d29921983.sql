-- Allow service role to update messages (needed for storing media URLs after download)
CREATE POLICY "Service role can update messages" 
ON public.wapi_messages 
FOR UPDATE 
USING (true)
WITH CHECK (true);