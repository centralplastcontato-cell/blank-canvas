
## Combinar Logo + Foto/IA em uma Imagem Composta

### Problema Atual
Hoje, cada opcao de imagem (IA, logo, foto do buffet, upload) **substitui** a anterior. O usuario quer poder **combinar** -- por exemplo, gerar uma arte com IA e sobrepor o logotipo do buffet, ou colocar o logo sobre uma foto do buffet.

### Solucao Proposta
Adicionar uma funcionalidade de **"Aplicar Logo"** que sobrepoe o logotipo da empresa sobre a imagem ja selecionada (seja ela gerada por IA, foto do buffet ou upload manual).

### Fluxo do Usuario
1. Seleciona uma imagem base (IA, foto do buffet ou upload)
2. Clica em **"+ Logo"** na barra de acoes
3. O sistema envia a imagem base + logo para uma edge function que combina as duas
4. A imagem resultante (com logo no canto) substitui a imagem atual

### Mudancas

**1. Nova Edge Function: `campaign-compose`**
- Recebe `base_image_url` (imagem selecionada) e `logo_url` (logotipo da empresa)
- Usa a API Gemini (modelo de edicao de imagem ja disponivel no projeto) para compor as duas imagens
- Prompt: "Place this logo in the bottom-right corner of the image, semi-transparent, without covering the main content"
- Faz upload do resultado para o bucket `sales-materials` e retorna a URL publica
- Registra uso em `ai_usage_logs`

**2. Atualizar `CampaignContextStep.tsx`**
- Novo estado `composing` para controlar loading
- Nova funcao `handleComposeLogo` que:
  - Valida que existe `draft.imageUrl` e `currentCompany.logo_url`
  - Chama `supabase.functions.invoke("campaign-compose", { body: { base_image_url, logo_url, company_id } })`
  - Atualiza `draft.imageUrl` com o resultado
- O botao "Logo" na action bar muda comportamento:
  - **Sem imagem selecionada**: funciona como hoje (usa logo como imagem principal)
  - **Com imagem selecionada**: abre opcao para "Substituir por logo" ou "Sobrepor logo na imagem"

**3. UI da Action Bar (com imagem selecionada)**
- Botao "Logo" vira um dropdown com duas opcoes:
  - "Substituir por logo" (comportamento atual)
  - "Sobrepor logo" (novo, chama `handleComposeLogo`)
- Ou, mais simples: renomear o botao para "+ Logo" e ele sempre sobrepoe quando ja tem imagem

### Detalhes Tecnicos

**Edge Function `campaign-compose/index.ts`:**
```text
POST { base_image_url, logo_url, company_id }
-> Chama Gemini image editing API (ai.gateway.lovable.dev)
-> Prompt: "Add this logo as a watermark in the bottom-right corner"
-> Upload resultado para sales-materials/campaigns/composed-{timestamp}.png
-> Retorna { url }
```

**Fluxo simplificado na UI:**
- Quando ha imagem e o usuario clica "+ Logo": mostra loading no botao, chama a edge function, atualiza a imagem
- Se nao ha logo configurado, o botao nao aparece (como ja e hoje)

### Limitacoes
- A composicao depende da qualidade da API de edicao de imagem -- o posicionamento do logo pode variar
- Alternativa mais simples (sem IA): usar Canvas API no frontend para sobrepor o logo, mas o resultado ficaria menos profissional
