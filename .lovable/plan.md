

## Atualizar Hero da LP com Fachadas das Duas Unidades

### Objetivo
Substituir a imagem de fundo atual (`hero-bg.jpg`) do Hero da Landing Page do Castelo da Diversao por uma composicao com as duas fotos de fachada enviadas, uma de cada unidade.

### Abordagem
Criar um background com as duas imagens lado a lado (split), onde cada metade mostra uma unidade. No mobile, as imagens ficarao empilhadas ou sera exibida apenas uma com transicao automatica (crossfade).

### Alteracoes

**1. Copiar as imagens para o projeto**
- `user-uploads://fachada_unidade_1.jpg` -> `src/assets/fachada-unidade-1.jpg`
- `user-uploads://fachada_unidade_2.jpg` -> `src/assets/fachada-unidade-2.jpg`

**2. Atualizar `src/components/landing/HeroSection.tsx`**
- Remover import do `hero-bg.jpg`
- Importar as duas novas imagens de fachada
- Substituir o background unico por um layout split:
  - Desktop: duas imagens lado a lado (50/50), cada uma com `object-cover`
  - Mobile: crossfade automatico entre as duas imagens (alternando a cada 4 segundos usando estado local)
- Manter o overlay gradiente por cima para legibilidade do texto
- Manter todo o restante do conteudo (logo, tagline, titulo, oferta, CTA) sem alteracao

### Detalhes tecnicos

```text
Background atual:
  <img src={heroBg} class="w-full h-full object-cover" />

Background novo (desktop):
  <div class="absolute inset-0 flex">
    <div class="w-1/2 h-full">
      <img src={fachada1} class="w-full h-full object-cover" />
    </div>
    <div class="w-1/2 h-full">
      <img src={fachada2} class="w-full h-full object-cover" />
    </div>
  </div>

Background novo (mobile):
  Ambas imagens empilhadas com position absolute,
  alternando opacidade via estado + framer-motion
  para criar efeito crossfade suave.
```

O overlay gradiente existente (`bg-gradient-to-b from-primary/60 via-castle/40 to-background/90`) sera mantido por cima das imagens para garantir contraste do texto.

