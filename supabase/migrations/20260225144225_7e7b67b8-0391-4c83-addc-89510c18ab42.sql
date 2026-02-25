UPDATE company_landing_pages
SET hero = jsonb_set(
  hero,
  '{title}',
  '"Onde cada sorriso vira uma lembrança pra sempre"'::jsonb
)
WHERE company_id = 'eb1776f0-142e-41db-9134-7d352d02c5bd';