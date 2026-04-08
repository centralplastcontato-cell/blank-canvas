-- Backfill: preencher company_id nos registros de auto-perdido que estão com company_id nulo
UPDATE public.lead_history lh
SET company_id = cl.company_id
FROM public.campaign_leads cl
WHERE lh.lead_id = cl.id
  AND lh.action = 'Lead movido para perdido automaticamente'
  AND lh.company_id IS NULL;