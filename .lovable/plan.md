

## Transformar o Gerador de Imagens em um Compositor de Artes Profissionais

### Problema Atual

O sistema gera ilustracoes digitais do zero usando IA, que ficam genericas, sem identidade visual do buffet, e frequentemente com textos indesejados. Isso nao se compara ao trabalho de uma agencia de marketing que usa **fotos reais** do espaco + **logo** + **tipografia** + **elementos decorativos** para criar artes profissionais.

### Nova Abordagem: "Design por Composicao"

Em vez de gerar imagens do zero, o fluxo passa a ser:

1. **Obrigatoriamente selecionar uma foto base** (do buffet, dos brinquedos, da fachada, de uma festa anterior)
2. **A IA compoe uma arte profissional** sobre essa foto: aplica o logo, adiciona moldura/elementos decorativos, ajusta cores e contraste
3. **Eliminar o botao "Gerar Arte com IA" que cria do zero** -- manter apenas o fluxo baseado em foto real

### Mudancas no Fluxo do Usuario

```text
ANTES:
  [Gerar Arte com IA] --> ilustracao generica do zero (ruim)
  [Fotos do Buffet] --> seleciona foto --> [Arte IA] --> composicao (bom, mas secundario)

DEPOIS:
  [Criar Arte] --> seleciona foto do buffet OU faz upload --> IA compoe arte profissional com logo + elementos
```

O usuario sempre parte de uma foto real. A IA so faz o trabalho de "design grafico": moldura, logo, efeitos visuais, ajuste de cores.

### Detalhes Tecnicos

**1. Edge Function `campaign-image/index.ts` -- Reescrever como compositor**

- Deixa de gerar do zero. Passa a receber `base_image_url` (obrigatorio) + `logo_url` (opcional) + `campaign_theme` + `context`
- Usar o modelo `google/gemini-3-pro-image-preview` (maior qualidade, melhor para edicao de fotos reais)
- Prompt otimizado para composicao no estilo agencia:
  - Manter a foto como elemento principal (70%+ da imagem)
  - Aplicar moldura/borda decorativa tematica
  - Posicionar logo com fundo semi-transparente para legibilidade
  - Ajustar saturacao e contraste para ficar vibrante
  - Adicionar elementos sutis relacionados ao tema (confetes, baloes, estrelas)
  - Regra absoluta: ZERO texto/letras/numeros

**2. Unificar `campaign-compose` dentro de `campaign-image`**

- Atualmente existem duas funcoes separadas (`campaign-image` para gerar do zero, `campaign-compose` para compor). Com a nova abordagem, ambas fazem a mesma coisa: compor sobre foto real
- Mover toda a logica para `campaign-image` e remover `campaign-compose`

**3. Frontend `CampaignContextStep.tsx` -- Simplificar o fluxo**

- **Remover** o botao "Gerar Arte com IA" que cria ilustracoes do zero
- **Novo fluxo principal**: botao "Criar Arte" que abre um dialog/popover com:
  - Grid de fotos do buffet (carregadas de `sales_materials`)
  - Opcao de upload de foto propria
  - Seletor de posicao do logo (grid 3x3 existente)
  - Checkbox "Incluir logotipo" (pre-marcado)
  - Botao "Gerar Arte Profissional"
- Quando o usuario clica "Gerar Arte Profissional", envia a foto + logo + tema para `campaign-image`
- Manter botoes de acao secundarios: upload manual, usar logo sozinho

**4. Prompt de composicao otimizado**

O prompt sera algo como:
```text
Voce e um designer grafico profissional de buffet infantil.
Transforme esta foto em uma arte promocional de alto impacto para WhatsApp.
Instrucoes:
- Use a foto fornecida como elemento visual PRINCIPAL (ocupe 70%+ da area)
- Adicione uma moldura/borda decorativa elegante nas bordas
- [Se logo] Posicione o logotipo no {posicao} com fundo semi-transparente
- Ajuste cores para ficarem vibrantes e convidativas
- Adicione elementos decorativos sutis relacionados ao tema: {tema_visual}
- PROIBIDO: qualquer texto, letra, palavra, numero ou caractere
- Formato: quadrado, alta resolucao, otimizado para WhatsApp
```

### Arquivos Modificados

1. `supabase/functions/campaign-image/index.ts` -- Reescrever para composicao sobre foto real (Gemini Pro Image)
2. `supabase/functions/campaign-compose/index.ts` -- Deletar (logica unificada em campaign-image)
3. `src/components/campanhas/CampaignContextStep.tsx` -- Novo fluxo: selecionar foto primeiro, depois IA compoe

### Resultado Esperado

O usuario seleciona uma foto real do seu buffet, clica "Gerar Arte", e recebe uma composicao profissional com moldura, logo e elementos decorativos -- igual ao que uma agencia faria, mas em segundos.

