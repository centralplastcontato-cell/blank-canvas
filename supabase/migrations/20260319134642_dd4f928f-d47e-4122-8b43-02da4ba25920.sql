
UPDATE public.company_landing_pages 
SET video = jsonb_set(
  video,
  '{videos,1,poster_url}',
  '"https://naked-screen-charm.lovable.app/images/poster-aventura-kids-novo.png"'::jsonb
),
updated_at = now()
WHERE company_id = 'eb1776f0-142e-41db-9134-7d352d02c5bd';
