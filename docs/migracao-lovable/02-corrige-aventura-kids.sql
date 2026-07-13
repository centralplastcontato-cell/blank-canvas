-- ============================================================
-- CORREÇÃO: tira o Aventura Kids de dentro da Lovable
-- ============================================================
-- PRÉ-REQUISITO OBRIGATÓRIO:
--   O arquivo aventura-kids.mp4 JÁ deve estar no Supabase Storage.
--   Se você rodar isto antes de subir o vídeo, o vídeo da LP quebra.
--   Confira abrindo esta URL no navegador (tem que baixar/tocar o vídeo):
--   https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/eb1776f0-142e-41db-9134-7d352d02c5bd/migrated/aventura-kids.mp4
--
-- Rode no Supabase Dashboard > SQL Editor, um passo de cada vez.
-- ============================================================


-- ------------------------------------------------------------
-- PASSO 1 — BACKUP (rode primeiro, guarde o resultado)
-- Copie a saída e salve num arquivo. É o seu botão de desfazer.
-- ------------------------------------------------------------
SELECT
  company_id,
  hero::text  AS hero_antes,
  video::text AS video_antes
FROM company_landing_pages
WHERE company_id = 'eb1776f0-142e-41db-9134-7d352d02c5bd';


-- ------------------------------------------------------------
-- PASSO 2 — PRÉVIA (não altera nada)
-- Mostra os 3 campos que ainda apontam pra Lovable.
-- ------------------------------------------------------------
SELECT
  hero->'background_images'->>0        AS hero_background,
  video->'videos'->0->>'poster_url'    AS poster_do_video,
  video->'videos'->1->>'video_url'     AS arquivo_do_video
FROM company_landing_pages
WHERE company_id = 'eb1776f0-142e-41db-9134-7d352d02c5bd';


-- ------------------------------------------------------------
-- PASSO 3 — A CORREÇÃO
-- Troca o domínio da Lovable pelo Supabase Storage.
-- Faz replace de texto no JSON inteiro: seguro e idempotente
-- (rodar duas vezes não causa dano — na 2ª não acha mais nada).
-- ------------------------------------------------------------
UPDATE company_landing_pages
SET
  hero = replace(
    hero::text,
    'https://naked-screen-charm.lovable.app/images/fachada-aventura-kids.jpg',
    'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/eb1776f0-142e-41db-9134-7d352d02c5bd/migrated/fachada-aventura-kids.jpg'
  )::jsonb,

  video = replace(
    replace(
      video::text,
      'https://naked-screen-charm.lovable.app/images/fachada-aventura-kids.jpg',
      'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/eb1776f0-142e-41db-9134-7d352d02c5bd/migrated/fachada-aventura-kids.jpg'
    ),
    'https://naked-screen-charm.lovable.app/videos/aventura-kids.mp4',
    'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/eb1776f0-142e-41db-9134-7d352d02c5bd/migrated/aventura-kids.mp4'
  )::jsonb

WHERE company_id = 'eb1776f0-142e-41db-9134-7d352d02c5bd';


-- ------------------------------------------------------------
-- PASSO 4 — VERIFICAÇÃO
-- Tem que retornar 0. Se retornar 0, o Aventura Kids está livre.
-- ------------------------------------------------------------
SELECT count(*) AS ainda_apontam_pra_lovable
FROM company_landing_pages
WHERE company_id = 'eb1776f0-142e-41db-9134-7d352d02c5bd'
  AND (hero::text ILIKE '%lovable%' OR video::text ILIKE '%lovable%');


-- ------------------------------------------------------------
-- ROLLBACK (só se precisar desfazer)
-- Cole os valores que você salvou no PASSO 1:
--
-- UPDATE company_landing_pages
-- SET hero = '<cole hero_antes aqui>'::jsonb,
--     video = '<cole video_antes aqui>'::jsonb
-- WHERE company_id = 'eb1776f0-142e-41db-9134-7d352d02c5bd';
-- ------------------------------------------------------------
