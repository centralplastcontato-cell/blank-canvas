UPDATE public.company_landing_pages 
SET video = jsonb_set(
  video::jsonb,
  '{video_url}',
  '"https://naked-screen-charm.lovable.app/videos/aventura-kids.mp4"'::jsonb
),
updated_at = now()
WHERE company_id = 'eb1776f0-142e-41db-9134-7d352d02c5bd';