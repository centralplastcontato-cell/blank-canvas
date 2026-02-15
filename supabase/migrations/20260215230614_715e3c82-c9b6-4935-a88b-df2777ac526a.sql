
-- Fix: backfill company_id on follow-up history records that were inserted without it
UPDATE lead_history lh
SET company_id = cl.company_id
FROM campaign_leads cl
WHERE lh.lead_id = cl.id
  AND lh.company_id IS NULL
  AND lh.action IN ('Follow-up automático enviado', 'Follow-up #2 automático enviado');
