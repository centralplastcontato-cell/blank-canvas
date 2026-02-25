UPDATE company_landing_pages
SET
  video = jsonb_set(video, '{poster_url}', '"https://naked-screen-charm.lovable.app/images/fachada-aventura-kids.jpg"'::jsonb),
  gallery = jsonb_set(
    gallery,
    '{photos}',
    (gallery->'photos') || '["https://naked-screen-charm.lovable.app/images/fachada-aventura-kids.jpg"]'::jsonb
  )
WHERE company_id = 'eb1776f0-142e-41db-9134-7d352d02c5bd';