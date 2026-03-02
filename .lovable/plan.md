

## Reforcar Regra: Nunca Escrever Texto nas Imagens

### Problema
Mesmo com a instrucao atual "DO NOT include any text", o DALL-E ainda gera imagens com texto em ingles (ex: "BAPPY TO SCHOOL"). A instrucao precisa ser mais enfatica e repetida no prompt.

### Solucao
Reforcar a proibicao de texto nos prompts de ambas as edge functions com instrucoes mais agressivas e repetidas (tecnica conhecida como "prompt reinforcement").

### Mudancas

**1. `supabase/functions/campaign-image/index.ts`**

Atualizar o prompt do DALL-E para ser mais enfatico:

```text
// Antes
"...DO NOT include any text, letters, words, numbers, or watermarks in the image. Pure visual art only..."

// Depois
"...CRITICAL RULE: The image must contain ZERO text. No letters, no words, no numbers, no banners with text, no signs, no watermarks, no captions, no titles - absolutely NO written characters in ANY language. This is a strict requirement. Pure visual illustration only..."
```

**2. `supabase/functions/campaign-compose/index.ts`**

Adicionar a mesma regra no prompt do modo `enhance` do Gemini:

```text
// Adicionar ao final do promptText quando enhance=true
"IMPORTANT: Do NOT add any text, letters, words, numbers, banners with text, or written characters of any kind to the image. Pure visual art only."
```

### Arquivos Modificados

1. `supabase/functions/campaign-image/index.ts` - reforcar proibicao de texto no prompt DALL-E
2. `supabase/functions/campaign-compose/index.ts` - adicionar proibicao de texto no modo enhance

