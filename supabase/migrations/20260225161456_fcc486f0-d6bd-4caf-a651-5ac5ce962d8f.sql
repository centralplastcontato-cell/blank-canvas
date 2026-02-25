UPDATE company_landing_pages
SET hero = jsonb_set(
  jsonb_set(hero::jsonb, '{secondary_cta_text}', 'null'),
  '{secondary_cta_url}', 'null'
)
WHERE company_id IN (SELECT id FROM companies WHERE name ILIKE '%aventura%');