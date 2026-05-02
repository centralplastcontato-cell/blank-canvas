
-- Atualiza coleção INTERNA (Nosso Espaço) com as 10 fotos da LP
UPDATE public.sales_materials
SET photo_urls = ARRAY[
  'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/internal/01-fachada.jpeg',
  'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/internal/02-salao.jpeg',
  'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/internal/08-salao-borboletas-v2.jpeg',
  'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/internal/03-brinquedao-frontal-v2.jpeg',
  'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/internal/04-brinquedao-completo.jpeg',
  'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/internal/05-brinquedao-arvore-v2.jpeg',
  'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/internal/06-area-baby.jpeg',
  'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/internal/07-arcade.jpeg',
  'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/internal/09-casa-arvore-externa.jpeg',
  'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/internal/10-pergolado-jardim.jpeg'
],
file_url = 'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/internal/01-fachada.jpeg',
is_active = true
WHERE id = '2e481349-913c-4240-b4df-3dbc22782e45';

-- Atualiza coleção EXTERNA (Festas Externas) com as 10 fotos da LP
UPDATE public.sales_materials
SET photo_urls = ARRAY[
  'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/external/external-1.jpeg',
  'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/external/external-2.jpeg',
  'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/external/external-3-v2.jpeg',
  'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/external/external-4.jpeg',
  'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/external/external-5-v2.jpeg',
  'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/external/external-6-v2.jpeg',
  'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/external/external-7-v2.jpeg',
  'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/external/external-8.jpeg',
  'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/external/external-9.jpeg',
  'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/external/external-10.jpeg'
],
file_url = 'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/landing-pages/b81fca0b-6cd8-41c6-9cad-9590f1ed5f39/gallery/external/external-1.jpeg',
is_active = true
WHERE id = '9666c7a3-6d06-4a36-9feb-64b7a7a0f2e8';
