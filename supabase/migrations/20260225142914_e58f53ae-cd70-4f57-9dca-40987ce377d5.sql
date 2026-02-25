UPDATE company_landing_pages
SET gallery = jsonb_set(
  gallery,
  '{photos}',
  (gallery->'photos') || '[
    "https://naked-screen-charm.lovable.app/images/aventura-kids-buffet-1.jpg",
    "https://naked-screen-charm.lovable.app/images/aventura-kids-buffet-2.jpg",
    "https://naked-screen-charm.lovable.app/images/aventura-kids-buffet-3.jpg"
  ]'::jsonb
)
WHERE company_id = 'eb1776f0-142e-41db-9134-7d352d02c5bd';