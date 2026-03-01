-- Fix existing bot questions with NULL company_id
UPDATE wapi_bot_questions q
SET company_id = i.company_id
FROM wapi_instances i
WHERE q.instance_id = i.id
  AND q.company_id IS NULL;