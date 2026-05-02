-- 1. Adicionar coluna event_mode em sales_materials (opcional, NULL = ambos)
ALTER TABLE public.sales_materials
ADD COLUMN IF NOT EXISTS event_mode text;

COMMENT ON COLUMN public.sales_materials.event_mode IS 'Filtra envio do bot por tipo de festa: interno, externo, ou NULL (ambos). Apenas usado quando bot_data.local_festa está definido.';

-- 2. Nova pergunta no bot do Espaço Carrossel: local da festa
-- Inserida com sort_order = 2.5 (entre "tipo" e "mes"), depois renumeramos
INSERT INTO public.wapi_bot_questions (company_id, instance_id, step, question_text, confirmation_text, sort_order, is_active)
SELECT 
  'b81fca0b-6cd8-41c6-9cad-9590f1ed5f39'::uuid,
  wi.id,
  'local_festa',
  E'{nome}, você quer fazer a festa *no nosso espaço* ou prefere uma *festa externa* (levamos as Barracas Gastronômicas até você)? 🎪✨\n\n1️⃣ No nosso espaço 🏰\n2️⃣ Festa externa 🚐',
  NULL,
  3,
  true
FROM public.wapi_instances wi
WHERE wi.company_id = 'b81fca0b-6cd8-41c6-9cad-9590f1ed5f39'
  AND NOT EXISTS (
    SELECT 1 FROM public.wapi_bot_questions q
    WHERE q.company_id = 'b81fca0b-6cd8-41c6-9cad-9590f1ed5f39'
      AND q.step = 'local_festa'
  );

-- Renumerar perguntas seguintes (mes=4, dia=5, convidados=6)
UPDATE public.wapi_bot_questions SET sort_order = 4 WHERE company_id = 'b81fca0b-6cd8-41c6-9cad-9590f1ed5f39' AND step = 'mes';
UPDATE public.wapi_bot_questions SET sort_order = 5 WHERE company_id = 'b81fca0b-6cd8-41c6-9cad-9590f1ed5f39' AND step = 'dia';
UPDATE public.wapi_bot_questions SET sort_order = 6 WHERE company_id = 'b81fca0b-6cd8-41c6-9cad-9590f1ed5f39' AND step = 'convidados';

-- 3. Cadastrar materiais do Espaço Carrossel (videos + photo collections)
-- Vídeos EXTERNOS
INSERT INTO public.sales_materials (company_id, unit, type, name, file_url, event_mode, sort_order, is_active)
VALUES
  ('b81fca0b-6cd8-41c6-9cad-9590f1ed5f39', 'ESPAÇO CARROSSEL', 'video', 'Festa Externa - Barracas Gastronômicas 1',
   'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/videos/carrossel-externa-1.mp4',
   'externo', 1, true),
  ('b81fca0b-6cd8-41c6-9cad-9590f1ed5f39', 'ESPAÇO CARROSSEL', 'video', 'Festa Externa - Barracas Gastronômicas 2',
   'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/videos/carrossel-externa-2.mp4',
   'externo', 2, true),
  ('b81fca0b-6cd8-41c6-9cad-9590f1ed5f39', 'ESPAÇO CARROSSEL', 'video', 'Festa Externa - Barracas Gastronômicas 3',
   'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/videos/carrossel-externa-3.mp4',
   'externo', 3, true),
  -- Vídeos INTERNOS
  ('b81fca0b-6cd8-41c6-9cad-9590f1ed5f39', 'ESPAÇO CARROSSEL', 'video', 'Festa no Espaço Carrossel 1',
   'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/espaco-carrossel/festa-interna-1.mp4',
   'interno', 1, true),
  ('b81fca0b-6cd8-41c6-9cad-9590f1ed5f39', 'ESPAÇO CARROSSEL', 'video', 'Festa no Espaço Carrossel 2',
   'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/espaco-carrossel/festa-interna-2.mp4',
   'interno', 2, true),
  ('b81fca0b-6cd8-41c6-9cad-9590f1ed5f39', 'ESPAÇO CARROSSEL', 'video', 'Festa no Espaço Carrossel 3',
   'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/internal/festa-interna-3.mp4',
   'interno', 3, true);

-- Coleção de fotos EXTERNA
INSERT INTO public.sales_materials (company_id, unit, type, name, file_url, photo_urls, event_mode, sort_order, is_active)
VALUES (
  'b81fca0b-6cd8-41c6-9cad-9590f1ed5f39', 'ESPAÇO CARROSSEL', 'photo_collection',
  'Fotos Festa Externa', '',
  ARRAY[
    'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/espaco-carrossel/fixes-20260428/poster-externa-1.jpg',
    'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/espaco-carrossel/fixes-20260428/poster-externa-2.jpg'
  ]::text[],
  'externo', 1, true
);

-- Coleção de fotos INTERNA
INSERT INTO public.sales_materials (company_id, unit, type, name, file_url, photo_urls, event_mode, sort_order, is_active)
VALUES (
  'b81fca0b-6cd8-41c6-9cad-9590f1ed5f39', 'ESPAÇO CARROSSEL', 'photo_collection',
  'Fotos Espaço Carrossel', '',
  ARRAY[
    'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/espaco-carrossel/fixes-20260428/poster-interna-2.jpg'
  ]::text[],
  'interno', 1, true
);