

## Plano: Adicionar preview/visualização dos materiais nos cards do Hub

### Objetivo
Adicionar uma área de preview visual em cada card de material na página `/hub/materiais`, permitindo que o admin veja o conteúdo (thumbnail de imagem/PDF, player de vídeo, grid de fotos) sem precisar abrir externamente.

### Mudanças (1 arquivo)

**`src/pages/HubMateriais.tsx`**

1. **Preview de imagem/PDF** — Para materiais com `file_url` válida:
   - Se for imagem (jpg/png/webp): mostrar thumbnail clicável com `<img>` e borda arredondada acima do nome
   - Se for PDF: mostrar thumbnail do link com ícone de PDF e link "Abrir" em nova aba
   - Se for vídeo: mostrar `<video>` compacto com controles nativos (poster frame)

2. **Preview de coleção de fotos** — Para `photo_collection` com `photo_urls`:
   - Mostrar grid compacto (2-3 thumbnails) das primeiras fotos + badge "+N" se houver mais

3. **Lightbox** — Adicionar o componente `ImageLightbox` (já existe em `src/components/ui/image-lightbox.tsx`) para abrir imagens em tela cheia ao clicar

4. **Estado quebrado** — Quando URL está quebrada, mostrar placeholder cinza com ícone de alerta em vez de tentar renderizar a mídia

### Layout do card atualizado

```text
┌──────────────────────────────┐
│  [Preview / Thumbnail]       │  ← NOVO: área de preview
├──────────────────────────────┤
│  📄 Nome do Material    [ON] │
│  Empresa • Unidade           │
│  [tipo] [50 pessoas] [✓ OK]  │
│  [  Substituir arquivo     ] │
└──────────────────────────────┘
```

### Detalhes técnicos
- Helper `isImageFile(url)` para detectar se a URL é imagem (extensão ou padrão Supabase) — reutilizar lógica do `SalesMaterialsSection`
- Preview de vídeo usa `<video>` com `preload="metadata"` para carregar apenas o primeiro frame
- Thumbnails com `aspect-ratio: 16/9`, `object-cover`, e `max-h-32` para manter cards compactos
- Clicar na preview abre lightbox (imagens) ou nova aba (PDF/vídeo)

