-- Sync contact_name from campaign_leads where conversation has a linked lead with a valid name
UPDATE wapi_conversations c
SET contact_name = l.name
FROM campaign_leads l
WHERE c.lead_id = l.id
  AND l.name IS NOT NULL
  AND l.name != ''
  AND l.name != '.'
  AND l.name != '-'
  AND (c.contact_name IS NULL OR c.contact_name = '' OR c.contact_name = '.' OR c.contact_name = '-');