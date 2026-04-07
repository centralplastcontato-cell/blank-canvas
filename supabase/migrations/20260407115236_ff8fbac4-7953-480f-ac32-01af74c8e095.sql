UPDATE wapi_conversations c
SET contact_name = cl.name
FROM campaign_leads cl
WHERE c.lead_id = cl.id
  AND c.contact_name = 'Castelo da Diversão'
  AND c.instance_id = '75feab3b-eb12-44f0-8ada-463e5540c869';