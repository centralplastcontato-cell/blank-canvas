

## Lightbox para Imagens da Galeria

Adicionar um lightbox (visualizador de imagens em tela cheia) para as galerias de fotos em todas as landing pages. Ao clicar em uma foto, ela abrirá em tela cheia com navegacao entre as imagens.

### O que muda

1. **Criar componente `ImageLightbox`** (`src/components/ui/image-lightbox.tsx`)
   - Modal fullscreen com fundo escuro semi-transparente
   - Imagem centralizada em tamanho grande
   - Botoes de navegacao (anterior/proximo) com setas
   - Botao de fechar (X)
   - Navegacao por teclado (setas, Esc para fechar)
   - Swipe em mobile (touch events)
   - Contador de fotos (ex: "3 / 10")
   - Animacoes suaves com framer-motion

2. **Atualizar `DLPGallery`** (`src/components/dynamic-lp/DLPGallery.tsx`)
   - Adicionar estado `selectedImage: number | null`
   - Tornar cada foto clicavel com `cursor-pointer` e `onClick`
   - Renderizar `ImageLightbox` passando as fotos da unidade ativa

3. **Atualizar `InstagramSection`** (`src/components/landing/InstagramSection.tsx`)
   - Mesmo padrao: estado `selectedImage`, onClick nas fotos, renderizar `ImageLightbox`

### Detalhes tecnicos

- O componente `ImageLightbox` usara `framer-motion` (ja instalado) para animacoes de entrada/saida
- Navegacao por teclado via `useEffect` com `keydown` listener
- Touch/swipe via `onTouchStart`/`onTouchEnd` para mobile
- `createPortal` para renderizar acima de todo o conteudo
- Props: `images: string[]`, `currentIndex: number`, `onClose: () => void`, `onNavigate: (index: number) => void`
