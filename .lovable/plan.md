

## Corrigir Imagens Quebradas na LP do Aventura Kids

### Problema
O logo e 4 fotos da galeria usam URLs do dominio Lovable (`naked-screen-charm.lovable.app/images/...`) que nao funcionam fora do preview. As outras 8 fotos estao no Supabase Storage e funcionam normalmente.

### URLs quebradas
- **Logo**: `naked-screen-charm.lovable.app/images/logo-aventura-kids.png`
- **Galeria foto 9**: `naked-screen-charm.lovable.app/images/fachada-aventura-kids.jpg`
- **Galeria foto 10**: `naked-screen-charm.lovable.app/images/aventura-kids-buffet-1.jpg`
- **Galeria foto 11**: `naked-screen-charm.lovable.app/images/aventura-kids-buffet-2.jpg`
- **Galeria foto 12**: `naked-screen-charm.lovable.app/images/aventura-kids-buffet-3.jpg`

### Solucao

**1. Criar edge function para migrar imagens para o Storage**

Criar uma edge function temporaria `migrate-images` que:
- Le os arquivos de `public/images/` do repositorio (passados como lista de URLs absolutas do Supabase Storage source)
- Na pratica, como nao podemos ler arquivos locais de uma edge function, a abordagem sera fazer o upload manualmente via codigo no frontend ou via SQL update direto

**Abordagem simplificada (recomendada):**

Como as imagens existem no repositorio em `public/images/`, vou criar um componente/pagina utilitaria temporaria que:
1. Busca cada imagem via fetch do dominio publicado
2. Faz upload para o bucket `onboarding-uploads` no Supabase Storage
3. Atualiza os registros no banco automaticamente

Porem, a forma mais simples e direta e:

**1. Atualizar os dados via SQL (UPDATE direto no banco)**

- Fazer upload manual das 5 imagens para o bucket `onboarding-uploads` usando a API de Storage do Supabase
- Atualizar `companies.logo_url` com a nova URL do Storage
- Atualizar `company_landing_pages.gallery` substituindo as 4 URLs quebradas

Vou implementar isso criando uma edge function `migrate-aventura-images` que:
1. Faz fetch das imagens usando as URLs do dominio publicado do Lovable (que ainda funciona)
2. Faz upload de cada uma para o bucket `onboarding-uploads`
3. Atualiza `companies.logo_url` e o JSONB `gallery` da LP

**2. Adicionar fallback de imagem nos componentes da LP**

- `DLPGallery.tsx`: Adicionar `onError` no `<img>` para ocultar fotos que falham no carregamento
- `DLPHero.tsx`: Adicionar `onError` no logo para usar fallback (iniciais da empresa)

### Plano Tecnico

**Arquivo novo: `supabase/functions/migrate-aventura-images/index.ts`**
- Edge function que faz fetch das 5 imagens, upload para Storage, e update no banco
- Usa `SUPABASE_SERVICE_ROLE_KEY` para acesso admin
- Endpoint unico de execucao (chamar uma vez e depois pode ser removida)

**Arquivo editado: `src/components/dynamic-lp/DLPGallery.tsx`**
- Adicionar estado local para rastrear imagens com erro
- No `<img>`, adicionar `onError` que marca a imagem como falha e a oculta do grid

**Arquivo editado: `src/components/dynamic-lp/DLPHero.tsx`**
- Adicionar `onError` no logo para esconde-lo graciosamente se a URL falhar

### Sequencia de execucao
1. Criar a edge function `migrate-aventura-images`
2. Deploya-la e executa-la uma vez via curl
3. Verificar que as URLs foram atualizadas no banco
4. Adicionar fallbacks de `onError` nos componentes da LP
5. (Opcional) Remover a edge function apos confirmacao

