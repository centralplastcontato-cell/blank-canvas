

## Adicionar segundo video (Promocional) na LP do Planeta Divertido

### Contexto
A Landing Page do Planeta Divertido atualmente exibe apenas o "Video do Espaco". Existe um segundo video ("Video Promocional") ja cadastrado nos materiais de vendas. O componente `DLPVideo` ja suporta multiplos videos via o array `videos[]`.

### Solucao

Criar uma migration SQL que atualiza o campo `video` (JSONB) da `company_landing_pages` do Planeta Divertido para usar o formato `videos[]` com ambos os videos.

### Arquivo criado

**`supabase/migrations/XXXXX_add_planeta_divertido_promo_video.sql`**

```sql
UPDATE company_landing_pages
SET video = jsonb_build_object(
  'enabled', true,
  'title', 'Conheca o Planeta Divertido',
  'video_url', null,
  'video_type', 'upload',
  'videos', jsonb_build_array(
    jsonb_build_object(
      'name', 'Video do Espaco',
      'video_url', 'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/6bc204ae-1311-4c67-bb6b-9ab55dae9d11/videos/1771618735052.mp4',
      'video_type', 'upload',
      'poster_url', 'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/6bc204ae-1311-4c67-bb6b-9ab55dae9d11/photos/1771618696306.jpg',
      'location', 'Planeta Divertido'
    ),
    jsonb_build_object(
      'name', 'Video Promocional',
      'video_url', 'https://rsezgnkfhodltrsewlhz.supabase.co/storage/v1/object/public/onboarding-uploads/6bc204ae-1311-4c67-bb6b-9ab55dae9d11/videos/1771639331178-7vcqwr4d7kl.mp4',
      'video_type', 'upload',
      'location', 'Planeta Divertido'
    )
  )
),
updated_at = now()
WHERE id = '19e28a5f-bb86-4e48-89a2-d48fde9ae8ad';
```

### Resultado esperado

A secao de video da LP do Planeta Divertido passara a exibir dois videos lado a lado (grid 2 colunas no desktop), igual ao layout do Castelo da Diversao com Manchester e Trujillo:
- **Video do Espaco** (com thumbnail/poster)
- **Video Promocional**

Nenhuma alteracao de codigo e necessaria -- o componente `DLPVideo` ja renderiza o array `videos[]` automaticamente.
