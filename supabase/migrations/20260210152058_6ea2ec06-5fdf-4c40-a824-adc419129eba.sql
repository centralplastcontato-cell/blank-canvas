-- Drop the existing FK and recreate with ON DELETE CASCADE
ALTER TABLE public.lead_history DROP CONSTRAINT lead_history_lead_id_fkey;
ALTER TABLE public.lead_history ADD CONSTRAINT lead_history_lead_id_fkey 
  FOREIGN KEY (lead_id) REFERENCES public.campaign_leads(id) ON DELETE CASCADE;

-- Also fix the wapi_conversations FK to SET NULL on delete
ALTER TABLE public.wapi_conversations DROP CONSTRAINT wapi_conversations_lead_id_fkey;
ALTER TABLE public.wapi_conversations ADD CONSTRAINT wapi_conversations_lead_id_fkey 
  FOREIGN KEY (lead_id) REFERENCES public.campaign_leads(id) ON DELETE SET NULL;