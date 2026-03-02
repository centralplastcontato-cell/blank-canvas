

## Gerador de Imagens com DALL-E 3 para Campanhas

### Objetivo
Adicionar um botão "Gerar Arte com IA" no step de criação de campanha que usa DALL-E 3 (OpenAI) para criar imagens promocionais. A imagem gerada sera salva no Supabase Storage e preenchida no draft como o upload manual.

### Arquitetura

```text
CampaignContextStep.tsx
        |
        | supabase.functions.invoke("campaign-image")
        v
campaign-image (Edge Function)
        |
        | POST api.openai.com/v1/images/generations
        v
   DALL-E 3 (OpenAI)
        |
        | base64 image
        v
   Upload to Supabase Storage (sales-materials bucket)
        |
        | public URL
        v
   Return URL to frontend
```

### Detalhes Tecnicos

#### 1. Nova Edge Function: `campaign-image`

Criar `supabase/functions/campaign-image/index.ts`:

- Recebe: `{ prompt_context, company_name, company_id }`
- Monta um prompt otimizado para arte de buffet infantil (sem texto na imagem, foco em visual promocional)
- Chama a API DALL-E 3: `POST https://api.openai.com/v1/images/generations`
  - model: `dall-e-3`
  - size: `1024x1024`
  - quality: `standard`
  - response_format: `b64_json`
- Recebe o base64, faz upload no bucket `sales-materials` com path `campaigns/ai-{timestamp}.png`
- Registra uso na tabela `ai_usage_logs` (function_name: "campaign-image", estimated_cost_usd: 0.04)
- Retorna a URL publica da imagem
- Trata erros 429 (rate limit) e 402 (billing)

Prompt exemplo interno:
> "Create a vibrant promotional banner for a children's party venue called '{companyName}'. Context: {promptContext}. Style: colorful, festive, balloons, confetti, party decorations. DO NOT include any text or letters in the image. Pure visual art only."

#### 2. Configuracao no `supabase/config.toml`

Adicionar:
```toml
[functions.campaign-image]
verify_jwt = false
```

#### 3. Atualizar `CampaignContextStep.tsx`

Na secao de imagem (onde hoje tem o upload manual), adicionar:

- Botao "Gerar Arte com IA" com icone Sparkles, ao lado do upload manual
- Estado `generatingImage` para loading
- Ao clicar: chama `supabase.functions.invoke("campaign-image")` passando `draft.description`, `companyName`, e `currentCompanyId`
- Ao receber a URL, preenche `draft.imageUrl` (mesmo fluxo do upload manual)
- Toast de sucesso/erro
- Layout: botao de upload e botao de IA lado a lado, ou IA como opcao secundaria abaixo do upload

#### 4. Registro de uso (ai_usage_logs)

Reutiliza a tabela `ai_usage_logs` existente:
- `function_name`: "campaign-image"
- `model`: "dall-e-3"
- `total_tokens`: 0 (DALL-E nao usa tokens)
- `estimated_cost_usd`: 0.04

Isso permite que o painel Hub de consumo de IA (`/hub/consumo-ia`) ja mostre o uso automaticamente.

### Sem alteracoes no banco de dados
Nenhuma migration necessaria -- reutiliza tabelas e buckets existentes.

### Seguranca
- A `OPENAI_API_KEY` ja esta configurada como secret do Supabase
- A chamada a OpenAI acontece apenas na Edge Function (server-side)
- O bucket `sales-materials` ja e publico

### Resumo de arquivos
| Arquivo | Acao |
|---|---|
| `supabase/functions/campaign-image/index.ts` | Criar (nova Edge Function) |
| `supabase/config.toml` | Adicionar config da nova function |
| `src/components/campanhas/CampaignContextStep.tsx` | Adicionar botao "Gerar Arte com IA" |

