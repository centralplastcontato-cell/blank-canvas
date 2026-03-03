

## Plan: Otimização de Thumbnails para Galeria de Campanhas

### Problema
As imagens da galeria são carregadas em resolução original (1-5MB cada), consumindo muitos dados do usuário. Como o Supabase Image Transformation é recurso pago (plano Pro), a solução é gerar thumbnails no momento do upload/geração.

### Abordagem
Criar uma **Edge Function `resize-image`** que recebe a URL de uma imagem, faz download, redimensiona para ~400px de largura usando a API Canvas do Deno, e faz upload do thumbnail no mesmo bucket. O `thumbnail_url` é salvo na tabela `campaign_images`.

### Mudanças

**1. Migration: adicionar coluna `thumbnail_url`**
```sql
ALTER TABLE public.campaign_images ADD COLUMN thumbnail_url text;
```

**2. Edge Function `resize-image`**
- Recebe `{ image_url, company_id }` 
- Faz fetch da imagem original
- Usa a lib `imagescript` (Deno-compatible) para redimensionar para 400px de largura mantendo proporção
- Converte para JPEG com qualidade 75%
- Upload no bucket `sales-materials` com path `campaigns/thumb-{timestamp}.jpg`
- Retorna `{ thumbnail_url }`

**3. Atualizar `CampaignContextStep.tsx`**
- Após salvar imagem na galeria (`saveImageToGallery`), chamar a edge function `resize-image` em background
- Atualizar o registro `campaign_images` com o `thumbnail_url` retornado

**4. Atualizar `CampaignGalleryTab.tsx`**
- Na grid da galeria, usar `img.thumbnail_url || img.image_url` como `src` das imagens
- No lightbox, continuar usando `img.image_url` (resolução original)

**5. Atualizar `campaign-image` Edge Function**
- Após gerar a arte via IA e fazer upload, gerar também o thumbnail chamando a mesma lógica de resize
- Salvar ambos URLs

### Resultado esperado
- Grid da galeria carrega imagens de ~30-50KB em vez de 1-5MB (redução de ~90%)
- Lightbox continua mostrando qualidade original
- Processo transparente para o usuário

