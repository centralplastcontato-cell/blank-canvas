

# Migrar de Lovable AI Gateway para OpenAI direto

## O que muda
As duas Edge Functions que usam IA (`lead-summary` e `fix-text`) vao passar a chamar a API da OpenAI diretamente usando a sua chave `OPENAI_API_KEY` que ja esta configurada no projeto.

## Alteracoes

### 1. `supabase/functions/lead-summary/index.ts`
- Trocar `LOVABLE_API_KEY` por `OPENAI_API_KEY`
- Trocar URL de `https://ai.gateway.lovable.dev/v1/chat/completions` para `https://api.openai.com/v1/chat/completions`
- Trocar modelo de `google/gemini-3-flash-preview` para `gpt-4o-mini` (bom custo-beneficio para resumos)
- Atualizar mensagens de erro

### 2. `supabase/functions/fix-text/index.ts`
- Mesmas trocas: `OPENAI_API_KEY`, URL da OpenAI, modelo `gpt-4o-mini`
- Atualizar mensagens de erro

### Modelo escolhido
- **gpt-4o-mini**: rapido, barato e suficiente para resumos e correcao de texto
- Se preferir mais qualidade, pode usar `gpt-4o` (mais caro)

## Arquivos modificados

| Arquivo | Acao |
|---------|------|
| `supabase/functions/lead-summary/index.ts` | Trocar gateway e chave para OpenAI |
| `supabase/functions/fix-text/index.ts` | Trocar gateway e chave para OpenAI |

## Observacoes
- A secret `OPENAI_API_KEY` ja existe no projeto, nao precisa configurar nada
- Os prompts permanecem identicos, so muda o provedor
- O tratamento de erros 429/402 continua funcionando (OpenAI usa os mesmos codigos HTTP)
