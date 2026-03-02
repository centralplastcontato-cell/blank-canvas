

## Gerar Imagem com Base no Tema da Campanha

### Problema
Ao clicar em "IA" para gerar imagem, o sistema envia apenas o campo `draft.description` (objetivo da campanha) como contexto. O titulo/tema selecionado (ex: "Dia dos Pais", "Natal Magico") nao e incluido, resultando em imagens genericas de festa infantil sem relacao com o tema escolhido.

### Solucao
Incluir o titulo da campanha (`draft.name`) no prompt de geracao de imagem, tanto na funcao DALL-E (`campaign-image`) quanto na funcao de composicao criativa (`campaign-compose`).

### Mudancas

**1. Frontend: `CampaignContextStep.tsx`**

Na funcao `handleGenerateImage`, passar tambem o `draft.name` no body da chamada:

```text
// Antes
body: { prompt_context: draft.description, company_name, company_id }

// Depois  
body: { prompt_context: draft.description, campaign_theme: draft.name, company_name, company_id }
```

Na funcao `handleEnhanceWithAI`, incluir o `draft.name` no campo `context`:

```text
// Antes
context: draft.description || null

// Depois
context: [draft.name, draft.description].filter(Boolean).join(" - ") || null
```

**2. Edge Function: `campaign-image/index.ts`**

Receber o novo campo `campaign_theme` e incorporar no prompt do DALL-E:

```text
// Antes
const prompt = `...Context: ${prompt_context}...`

// Depois
const themeHint = campaign_theme ? `Theme: "${campaign_theme}". ` : "";
const prompt = `...${themeHint}Context: ${prompt_context}...`
```

Se o tema for "Dia dos Pais", o prompt incluira "Theme: Dia dos Pais", guiando a IA a gerar imagens com elementos de pai e filho, presentes, etc. Se for "Natal Magico", tera arvores, Papai Noel, etc.

**3. Edge Function: `campaign-compose/index.ts`**

O campo `context` ja e enviado para o modo `enhance`. Como o frontend vai concatenar tema + descricao, nenhuma mudanca e necessaria nesta funcao.

### Arquivos Modificados

1. `src/components/campanhas/CampaignContextStep.tsx` - enviar `draft.name` como tema
2. `supabase/functions/campaign-image/index.ts` - usar tema no prompt DALL-E

