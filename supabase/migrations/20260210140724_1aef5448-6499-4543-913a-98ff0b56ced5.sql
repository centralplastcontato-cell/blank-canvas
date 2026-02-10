
-- Step 1: Identify the "best" lead to keep per whatsapp number
-- Priority: has responsavel_id > most advanced status > oldest created_at
CREATE TEMPORARY TABLE leads_to_keep AS
WITH ranked_leads AS (
  SELECT 
    id,
    whatsapp,
    company_id,
    ROW_NUMBER() OVER (
      PARTITION BY whatsapp, company_id 
      ORDER BY 
        -- Prefer leads with a responsavel assigned
        CASE WHEN responsavel_id IS NOT NULL THEN 0 ELSE 1 END,
        -- Prefer more advanced statuses
        CASE status 
          WHEN 'fechado' THEN 0
          WHEN 'transferido' THEN 1
          WHEN 'orcamento_enviado' THEN 2
          WHEN 'aguardando_resposta' THEN 3
          WHEN 'em_contato' THEN 4
          WHEN 'perdido' THEN 5
          WHEN 'novo' THEN 6
          ELSE 7
        END,
        -- Prefer oldest (original) lead
        created_at ASC
    ) AS rn
  FROM campaign_leads
)
SELECT id, whatsapp, company_id FROM ranked_leads WHERE rn = 1;

-- Step 2: Update conversations pointing to duplicate leads → point to the kept lead
UPDATE wapi_conversations wc
SET lead_id = ltk.id
FROM leads_to_keep ltk
WHERE wc.lead_id IN (
  SELECT cl.id FROM campaign_leads cl 
  WHERE cl.whatsapp = ltk.whatsapp 
    AND cl.company_id = ltk.company_id 
    AND cl.id != ltk.id
)
AND ltk.whatsapp = (
  SELECT whatsapp FROM campaign_leads WHERE id = wc.lead_id
);

-- Step 3: Delete lead_history for duplicate leads that will be removed
DELETE FROM lead_history
WHERE lead_id IN (
  SELECT cl.id 
  FROM campaign_leads cl
  JOIN leads_to_keep ltk ON cl.whatsapp = ltk.whatsapp AND cl.company_id = ltk.company_id
  WHERE cl.id != ltk.id
);

-- Step 4: Delete the duplicate leads
DELETE FROM campaign_leads
WHERE id NOT IN (SELECT id FROM leads_to_keep);

-- Step 5: Add unique constraint to prevent future duplicates per company
ALTER TABLE campaign_leads 
ADD CONSTRAINT campaign_leads_whatsapp_company_unique 
UNIQUE (whatsapp, company_id);

-- Clean up temp table
DROP TABLE leads_to_keep;
