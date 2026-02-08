-- Add day_of_month column to store the specific day the lead is interested in
ALTER TABLE public.campaign_leads 
ADD COLUMN day_of_month integer;