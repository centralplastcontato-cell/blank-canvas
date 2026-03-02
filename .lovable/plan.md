

## Fluxo Combinado: Foto + Logo + IA

### Problema
Hoje cada acao (IA, Logo, Fotos, Upload) substitui a imagem anterior. O usuario quer combinar os tres elementos: uma foto base + o logotipo da empresa + um tratamento/melhoria via IA, tudo junto.

### Solucao
Adicionar um botao **"Criar Arte Completa"** que faz tudo em uma unica chamada: envia a foto base + logo para a IA e pede que ela crie uma arte profissional combinando os dois elementos.

### Mudancas

**1. Atualizar Edge Function `campaign-compose`**

Adicionar um novo modo `enhance` alem do modo atual de sobreposicao simples. Quando `enhance: true`, o prompt muda para pedir uma composicao criativa:

- Modo atual (sobreposicao): "Place this logo in the X corner" (comportamento existente, nao muda)
- Modo novo (arte completa): "Create a professional marketing image for a children's party venue. Use this photo as the main visual and incorporate this logo prominently. Add festive design elements, improve lighting and colors. The result should look like a polished promotional flyer."

O parametro `position` continua funcionando para indicar onde o logo deve ficar.

**2. Atualizar `CampaignContextStep.tsx`**

Na action bar (quando ja tem imagem selecionada), adicionar um botao extra ou modificar o comportamento:

- Botao "+ Logo" continua igual (sobreposicao simples com escolha de posicao)
- Novo botao **"Arte IA"** (ou icone de varinha magica) que:
  - So aparece quando ja tem imagem selecionada
  - Abre um popover com opcao de posicao do logo + botao "Criar Arte"
  - Chama `campaign-compose` com `enhance: true`, `base_image_url`, `logo_url`, `position` e `context` (descricao da campanha)
  - O resultado e uma arte profissional que combina foto + logo + elementos de design

**3. Detalhes do Popover "Arte IA"**

Quando o usuario clica no botao, aparece:
- Seletor de posicao do logo (mesma grade 3x3 que ja existe)
- Checkbox "Incluir logotipo" (pre-marcado se empresa tem logo)
- Botao "Criar Arte com IA"
- Texto explicativo: "A IA vai criar uma arte profissional combinando sua foto com o logotipo"

### Implementacao Tecnica

**Edge Function `campaign-compose/index.ts`:**

Adicionar campo `enhance` e `context` no body:
```text
POST {
  base_image_url,    // foto base (obrigatorio)
  logo_url,          // logo (opcional se enhance=true sem logo)
  company_id,
  position,          // posicao do logo
  enhance: true,     // novo campo
  context: "..."     // descricao da campanha para IA contextualizar
}
```

Quando `enhance: true`, o prompt do Gemini muda para:
"Create a professional, eye-catching promotional image for a children's party venue. Use the provided photo as the main background/visual element. Place the company logo in the [position]. Add subtle festive design elements (confetti, balloons, stars) around the edges. Enhance the colors to look vibrant and inviting. The image should look like a polished marketing material. Campaign context: [context]"

**Frontend `CampaignContextStep.tsx`:**

- Novo estado `enhancing` para loading
- Nova funcao `handleEnhanceWithAI` que chama a edge function com `enhance: true`
- Na action bar, trocar o botao "IA" (que hoje gera uma imagem do zero) por um botao que, quando ja tem imagem, faz a composicao inteligente
- Logica: se tem imagem, o botao "IA" abre popover com opcoes de posicao do logo + "Criar Arte"; se nao tem imagem, funciona como antes (gera imagem do zero com DALL-E)

### Fluxo do Usuario (Resumo)

1. Seleciona uma foto (upload, galeria do buffet, ou gera com IA)
2. Clica em "Arte IA" na action bar
3. Escolhe a posicao do logo no popover
4. Clica "Criar Arte com IA"
5. A IA combina foto + logo + elementos de design em uma arte profissional
6. A imagem resultante substitui a atual

### Arquivos Modificados

1. `supabase/functions/campaign-compose/index.ts` - adicionar modo `enhance` com prompt criativo
2. `src/components/campanhas/CampaignContextStep.tsx` - novo botao e logica de arte combinada
