
# Plano: DLP Institucional - Cópia da LP de Campanha

## Objetivo
Transformar a Landing Page Dinâmica (DLP) em uma copia fiel da LP de campanha do Castelo da Diversao, porem sem a promocao -- uma LP institucional. Todas as secoes devem ter o mesmo visual, estrutura e animacoes.

## O que muda

### 1. Modelo de dados (tipos)
O tipo `LPVideo` atualmente suporta apenas 1 video. O tipo `LPGallery` tem fotos sem separacao por unidade. Precisamos expandir ambos:

- **LPVideo**: adicionar campo opcional `videos` (array de objetos com `name`, `video_url`, `video_type`, `poster_url`, `location`) para suportar multiplos videos por unidade
- **LPGallery**: adicionar campo opcional `units` (array de objetos com `name`, `photos[]`) para fotos agrupadas por unidade

Os campos antigos (`video_url`, `photos[]`) continuam funcionando como fallback para LPs que nao usam unidades.

### 2. Secao Hero (DLPHero)
- Adicionar confetti animado flutuando (como na LP de campanha)
- Adicionar scroll indicator animado no rodape
- Manter o split de imagens e crossfade mobile que ja existe

### 3. Secao de Video (DLPVideo) -- Redesign Total
Copiar a estrutura da `VideoGallerySection`:
- Grid de 2 colunas no desktop (1 coluna mobile)
- Cada video em card com borda, sombra, info bar com nome da unidade e localizacao
- Aspect ratio 9:16 no mobile, 16:9 no desktop
- Suportar tanto o formato antigo (1 video) quanto o novo (array de videos)

### 4. Secao de Galeria (DLPGallery) -- Redesign Total
Copiar a estrutura da `InstagramSection`:
- Abas por unidade (botoes pill com icone MapPin)
- Grid de fotos 2x5 no desktop com animacao de troca (AnimatePresence)
- Hover com overlay gradiente
- Manter trust badges na parte inferior
- Suportar tanto formato antigo (lista plana) quanto novo (por unidade)

### 5. Nova Secao: DLPBenefits
Copiar a `BenefitsSection` da LP de campanha:
- Grid 2x3 de cards com icones coloridos
- Hover com efeito de escala e glow
- Dados vindo do banco (campo `benefits` no JSONB) ou fallback com beneficios padrao
- Trust badges pill no rodape (4.9 Google, +500 festas, 98% satisfacao) -- remover da galeria para evitar duplicacao

### 6. Secao de Depoimentos (DLPTestimonials)
- Adicionar trust badges numericos abaixo dos cards ("+500 Festas", "4.9 Avaliacao", "98% Satisfacao") -- no estilo numerico grande da LP de campanha
- Manter o layout de cards que ja esta bom

### 7. Secao de Oferta (DLPOffer) -- Ajuste Institucional
- Converter para tom institucional: em vez de "OFERTA ESPECIAL", usar "Por que nos escolher?" ou similar quando nao houver promocao
- Manter glassmorphism e layout 2 colunas
- Beneficios vem do campo `offer.description` ou lista padrao

### 8. Ordem das Secoes na Pagina
Alinhar com a LP de campanha:
```
Hero -> Benefits (nova) -> Testimonials -> Videos -> Gallery (com abas) -> Offer/CTA -> Footer
```

## Detalhes Tecnicos

### Arquivo: `src/types/landing-page.ts`
- Adicionar `LPVideoUnit` interface com campos `name`, `video_url`, `video_type`, `poster_url?`, `location?`
- Estender `LPVideo` com campo opcional `videos?: LPVideoUnit[]`
- Adicionar `LPGalleryUnit` interface com campos `name`, `photos: string[]`
- Estender `LPGallery` com campo opcional `units?: LPGalleryUnit[]`

### Arquivo: `src/components/dynamic-lp/DLPBenefits.tsx` (novo)
- Componente novo com grid de 6 beneficios
- Icones mapeados por nome (Castle, Gamepad2, UtensilsCrossed, Users, Camera, Award)
- Cores dos gradientes usando `theme.primary_color` e `theme.secondary_color`
- Trust badges pill na parte inferior

### Arquivo: `src/components/dynamic-lp/DLPVideo.tsx` (reescrita)
- Verificar se `video.videos[]` existe (novo formato) ou usar `video.video_url` (formato antigo)
- Grid `md:grid-cols-2` para multiplos videos
- Card com borda, sombra, info bar por unidade

### Arquivo: `src/components/dynamic-lp/DLPGallery.tsx` (reescrita)
- Verificar se `gallery.units[]` existe (novo formato) ou usar `gallery.photos[]` (formato antigo)
- Abas de unidade com `useState` e `AnimatePresence`
- Grid `grid-cols-2 sm:grid-cols-3 md:grid-cols-5`
- Remover trust badges (movidos para DLPBenefits)

### Arquivo: `src/components/dynamic-lp/DLPHero.tsx` (ajuste)
- Adicionar confetti particles animados
- Adicionar scroll indicator

### Arquivo: `src/pages/DynamicLandingPage.tsx`
- Importar e adicionar `DLPBenefits`
- Reordenar secoes: Hero, Benefits, Testimonials, Video, Gallery, Offer, Footer

### Sem mudancas no banco de dados
Os campos JSONB ja suportam qualquer estrutura. Basta o admin salvar os dados no novo formato. O codigo faz fallback para o formato antigo.
