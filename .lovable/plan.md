

## Corrigir 2 bugs no Resumo do Dia

### Bug 1: "Orcamentos" mostra 1 em vez de 2

O deploy anterior ja corrigiu a logica adicionando `proximo_passo_reminded` ao `completedBotSteps`. Porem, a Amanda (lead f0e1aca5) tem `bot_step: proximo_passo_reminded` mas seu `bot_data` nao contem o campo `proximo_passo`. O resumo pode estar usando dados em cache. Ao clicar em "Atualizar" na tela, o valor deve subir para 2. Se nao subir, investigaremos mais.

### Bug 2: "Vao pensar" mostra 0 em vez de 1

**Causa raiz**: Amanda Tagawa escolheu a opcao 3, mas no banco de dados o valor foi salvo como texto `"Analisar com calma"` em vez do numero `"3"`. A logica atual compara:

```text
if (pp === "3") querPensar++;
if (pp === "2") querHumano++;
```

Isso nunca bate porque o valor real e o texto descritivo.

**Solucao no arquivo `supabase/functions/daily-summary/index.ts`**:

Expandir a comparacao para aceitar tanto o numero quanto o texto:

```text
Antes:
  if (pp === "3") querPensar++;
  if (pp === "2") querHumano++;

Depois:
  const ppNorm = (pp || "").toLowerCase();
  if (pp === "3" || ppNorm.includes("analisar") || ppNorm.includes("pensar")) querPensar++;
  if (pp === "2" || ppNorm.includes("dúvida") || ppNorm.includes("duvida") || ppNorm.includes("humano")) querHumano++;
```

Isso garante que tanto o formato numerico ("3") quanto o texto ("Analisar com calma") sejam reconhecidos corretamente.

### Resumo das mudancas

- **1 arquivo editado**: `supabase/functions/daily-summary/index.ts` (linhas 211-218)
- **Deploy**: edge function `daily-summary`
- **Impacto**: a metrica "Vao pensar" passara a contar corretamente leads que escolheram a opcao 3, independente do formato salvo no banco

