

## Problema Identificado

A LP do Planeta Divertido usa o **mesmo layout split 50/50** no Hero que foi projetado para o Castelo da Diversao (que tem 2 unidades com fachadas diferentes). O Planeta Divertido tem **apenas 1 unidade**, entao:

- No desktop: a imagem ocupa so metade da tela, e a outra metade mostra uma segunda foto que nao e uma "segunda unidade"
- O visual fica identico ao layout antigo do Castelo
- A galeria e video tambem nao tem separacao por unidades/abas (porque so tem 1 unidade)

## Solucao

Modificar o componente `DLPHero` para detectar se o buffet tem **multiplas unidades** e adaptar o layout automaticamente:

### 1. Hero - Layout adaptativo (DLPHero.tsx)

- **1 unidade (Planeta Divertido)**: Usar imagem de fundo **full-width** com crossfade entre as fotos (tanto desktop quanto mobile) -- visual mais impactante e imersivo
- **2+ unidades (Castelo)**: Manter o layout split 50/50 atual no desktop

A logica ja existe parcialmente: `hasMultipleImages` verifica se tem 2+ imagens, mas nao distingue se sao "unidades diferentes" ou "fotos do mesmo lugar". A correcao sera passar uma prop `multipleUnits` baseada nos dados do onboarding.

### 2. Passar informacao de unidades (DynamicLandingPage.tsx)

- Buscar o campo `multiple_units` do `company_onboarding` (ja e feito o fetch do onboarding para pegar o WhatsApp)
- Passar como prop para o `DLPHero`

### 3. Ajuste no Hero para unidade unica

Quando `multipleUnits === false` e tem `background_images`, o Hero vai:
- Desktop: mostrar a **primeira imagem full-width** como fundo fixo, com crossfade entre todas as imagens disponíveis (igual ao mobile atual)
- Mobile: manter o crossfade entre imagens (ja funciona bem)
- Resultado: visual premium de tela cheia, sem o lado "vazio"

---

## Detalhes Tecnicos

### Arquivos modificados

1. **`src/components/dynamic-lp/DLPHero.tsx`**
   - Adicionar prop `multipleUnits?: boolean`
   - No `renderBackground()`, quando `hasMultipleImages && !multipleUnits`: renderizar crossfade full-width em todas as telas (remover o split 50/50)
   - Quando `hasMultipleImages && multipleUnits`: manter split 50/50 atual

2. **`src/pages/DynamicLandingPage.tsx`**
   - Extrair `multiple_units` do fetch de `company_onboarding` (ja feito para WhatsApp)
   - Passar `multipleUnits={data.multipleUnits}` para `<DLPHero />`

### Mudancas especificas no DLPHero

```text
renderBackground():
  SE hasMultipleImages E multipleUnits:
    -> Split 50/50 desktop + crossfade mobile (comportamento atual)
  SE hasMultipleImages E NAO multipleUnits:
    -> Crossfade full-width em TODAS as telas
  SE apenas background_image_url:
    -> Imagem unica full-width (comportamento atual)
```

### Impacto

- **Planeta Divertido**: Hero passa a ter imagem de fundo full-width com crossfade elegante
- **Castelo da Diversao**: Continua com split 50/50 mostrando as duas fachadas
- **Novos buffets**: Automaticamente detectado via `multiple_units` do onboarding

