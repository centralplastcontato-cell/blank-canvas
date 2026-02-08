-- Permitir que usuários autenticados excluam leads
CREATE POLICY "Usuários autenticados podem excluir leads"
ON public.campaign_leads
FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);