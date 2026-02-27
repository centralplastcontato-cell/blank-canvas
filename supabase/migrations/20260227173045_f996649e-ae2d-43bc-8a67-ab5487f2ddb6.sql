-- Fix 6 leads with incorrect unit "Castelo da Diversão" -> "Trujillo"
UPDATE campaign_leads 
SET unit = 'Trujillo' 
WHERE company_id = 'a0000000-0000-0000-0000-000000000001' 
  AND unit = 'Castelo da Diversão';

-- Register in lead_history for audit trail
INSERT INTO lead_history (lead_id, action, old_value, new_value, user_name, company_id)
SELECT id, 'unit_changed', 'Castelo da Diversão', 'Trujillo', 'Sistema (correção automática)', 'a0000000-0000-0000-0000-000000000001'
FROM campaign_leads
WHERE company_id = 'a0000000-0000-0000-0000-000000000001'
  AND unit = 'Trujillo'
  AND created_at >= '2025-01-01'
  AND id IN (
    SELECT id FROM campaign_leads 
    WHERE company_id = 'a0000000-0000-0000-0000-000000000001'
    ORDER BY created_at DESC
    LIMIT 6
  );