-- Hub → Instagram: vídeo (Reels) postado à mão no painel.
-- 1) o post pode ser do tipo "reels"
ALTER TABLE public.hub_instagram_posts DROP CONSTRAINT IF EXISTS hub_instagram_posts_tipo_check;
ALTER TABLE public.hub_instagram_posts ADD CONSTRAINT hub_instagram_posts_tipo_check
  CHECK (tipo IN ('foto', 'pergunta', 'carrossel', 'reels'));

-- 2) o balde aceita vídeos de até 100 MB (limite do Reels no Postaí)
UPDATE storage.buckets SET file_size_limit = 104857600 WHERE id = 'hub-instagram';
