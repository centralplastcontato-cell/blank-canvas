

## Atualizar Hero da LP Dinamica com Fachadas das Duas Unidades

### O que muda
A landing page dinamica em `/lp/castelo-da-diversao` (componente `DLPHero`) atualmente mostra uma unica foto antiga do interior. Vamos substituir pela mesma composicao de fachadas das duas unidades que ja foi aplicada na LP de campanha.

### Abordagem

Como o `DLPHero` e um componente generico usado por qualquer empresa, vamos adicionar suporte opcional a multiplas imagens de fundo, mantendo retrocompatibilidade.

### Alteracoes

**1. Atualizar tipo `LPHero` em `src/types/landing-page.ts`**
- Adicionar campo opcional `background_images?: string[]` ao tipo `LPHero`
- O campo `background_image_url` existente continua funcionando como fallback

**2. Atualizar componente `src/components/dynamic-lp/DLPHero.tsx`**
- Adicionar estado e efeito para crossfade mobile (mesmo padrao do `HeroSection`)
- Quando `hero.background_images` existir e tiver 2+ imagens:
  - Desktop: layout split lado a lado (50/50) com `object-cover`
  - Mobile: crossfade automatico entre as imagens a cada 4 segundos
- Quando nao existir, manter comportamento atual (imagem unica via `background_image_url`)
- Manter o overlay gradiente em ambos os casos

**3. Copiar imagens para `public/` e atualizar banco de dados**
- Copiar `fachada-unidade-1.jpg` e `fachada-unidade-2.jpg` para `public/images/`
- Atualizar o JSON `hero` no registro da `company_landing_pages` do Castelo da Diversao para incluir o campo `background_images` com as URLs publicas das duas fotos

### Detalhes tecnicos

```text
Tipo atualizado:
  interface LPHero {
    title: string;
    subtitle: string;
    cta_text: string;
    background_image_url: string | null;
    background_images?: string[];   // NOVO - opcional
  }

DLPHero - logica de renderizacao:
  Se hero.background_images?.length >= 2:
    Desktop: flex split 50/50
    Mobile: crossfade com useState + setInterval
  Senao:
    Comportamento atual (imagem unica)

Atualizacao no banco (SQL):
  UPDATE company_landing_pages
  SET hero = jsonb_set(hero, '{background_images}',
    '["URL_FACHADA_1", "URL_FACHADA_2"]')
  WHERE id = 'fbc21bee-3993-4ace-9cd9-72c8ae8dd1f4';
```

### Resultado
A LP dinamica do Castelo da Diversao passara a mostrar as duas fachadas das unidades, com visual moderno e consistente com a LP de campanha. Outras empresas que usam a LP dinamica nao serao afetadas (campo opcional).

