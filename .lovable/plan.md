

# Migrar Support Chat para OpenAI + Rastrear Consumo

## Objetivo
Trocar a IA do chatbot de suporte de Lovable AI (Gemini) para OpenAI (gpt-4o-mini) -- mesmo modelo usado no resto da plataforma -- e registrar cada chamada na tabela `ai_usage_logs` para que o consumo apareca no painel Hub > Consumo IA.

---

## Mudancas

### 1. Edge Function `support-chat/index.ts`

- Trocar `LOVABLE_API_KEY` por `OPENAI_API_KEY` (ja existe nos secrets)
- Trocar endpoint de `ai.gateway.lovable.dev` para `api.openai.com/v1/chat/completions`
- Trocar modelo de `google/gemini-3-flash-preview` para `gpt-4o-mini`
- Adicionar import do `createClient` do Supabase (igual ao `fix-text`)
- Receber `company_id` no body (enviado pelo frontend junto com messages e context)
- Apos resposta da OpenAI, inserir registro em `ai_usage_logs` com:
  - `function_name: 'support-chat'`
  - `model: 'gpt-4o-mini'`
  - Tokens e custo estimado (mesmo calculo do `fix-text`)
- Manter toda a logica de tool calling e knowledge base intacta

### 2. Frontend `SupportChatbot.tsx`

- Passar `company_id` no body da chamada `supabase.functions.invoke("support-chat", ...)` para que a Edge Function saiba qual empresa logar
- O `company_id` ja esta disponivel via `getContext()` no componente

### 3. Painel Hub `HubAIUsage.tsx`

- Adicionar `"support-chat": "Chat Suporte"` no objeto `functionLabels` para que as chamadas aparecam com nome amigavel no grafico e na tabela

---

## Detalhes Tecnicos

### Edge Function - Mudancas principais

```text
ANTES                                    DEPOIS
─────                                    ──────
LOVABLE_API_KEY                       -> OPENAI_API_KEY
ai.gateway.lovable.dev/v1/...         -> api.openai.com/v1/chat/completions
google/gemini-3-flash-preview         -> gpt-4o-mini
Sem log de uso                        -> Insert em ai_usage_logs
Sem company_id no body                -> Recebe company_id
```

O padrao de logging sera identico ao `fix-text`:
- Custo estimado: `(prompt_tokens * 0.15 + completion_tokens * 0.6) / 1_000_000`
- Insert silencioso (erro de log nao quebra a resposta)

### Arquivos modificados

| Arquivo | Mudanca |
|---------|---------|
| `supabase/functions/support-chat/index.ts` | Trocar para OpenAI + adicionar logging |
| `src/components/support/SupportChatbot.tsx` | Enviar `company_id` no body |
| `src/pages/HubAIUsage.tsx` | Adicionar label "Chat Suporte" |

### Nenhuma dependencia nova necessaria

- `OPENAI_API_KEY` ja esta configurada nos secrets
- Tabela `ai_usage_logs` ja existe
- Modelo `gpt-4o-mini` ja e usado nas demais funcoes
