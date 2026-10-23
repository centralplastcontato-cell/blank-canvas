-- "Aprenda a usar": primeiro vídeo (configurar a IA em 7 passos).
-- O arquivo fica no site (public/videos). Pode rodar de novo: não duplica.
insert into public.training_lessons (title, description, video_url, thumbnail_url, category, sort_order, is_published)
select
  'Sua IA de atendimento pronta em 7 passos',
  'Passo a passo para deixar a IA pronta para atender no WhatsApp: pacotes e preços, agenda, configuração, materiais, teste e como ligar.',
  '/videos/ia-7-passos.mp4',
  '/videos/ia-7-passos.jpg',
  'Inteligência Artificial',
  0,
  true
where not exists (
  select 1 from public.training_lessons where video_url = '/videos/ia-7-passos.mp4'
);
