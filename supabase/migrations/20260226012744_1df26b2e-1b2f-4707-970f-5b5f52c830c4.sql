INSERT INTO company_units (company_id, name, slug, sort_order, is_active, color)
VALUES ('eb1776f0-142e-41db-9134-7d352d02c5bd', 'Aventura Kids', 'aventura-kids', 1, true, '#3b82f6')
ON CONFLICT DO NOTHING;