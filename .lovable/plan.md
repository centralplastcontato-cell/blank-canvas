

## Corrigir logica de "Nao Completaram" para considerar leads no proximo_passo como completos

### Problema
A Amanda (e outros leads) ja passou por todo o fluxo do bot, respondeu todas as perguntas, recebeu o orcamento e os materiais. Ela so nao respondeu a ultima mensagem de "proximo passo" (agendar visita / tirar duvidas / analisar). Mesmo assim, aparece como "Nao completou", o que e enganoso -- na pratica, ela ja recebeu tudo que precisava.

### Solucao
Considerar os passos `proximo_passo` e `proximo_passo_reminded` como fluxo completo, ja que nesse ponto o lead ja recebeu o orcamento e todos os materiais.

### O que muda para o usuario
- Leads que ja receberam o orcamento mas nao responderam a ultima pergunta (proximo passo) **nao aparecem mais** como "Nao completaram"
- A lista passa a mostrar apenas leads que realmente pararam no meio da qualificacao (ex: parou na pergunta do mes, do nome, dos convidados)
- Resultado mais preciso e sem falsos alarmes

### Detalhes tecnicos

**Arquivo: `supabase/functions/daily-summary/index.ts`**

Alterar a lista de `completedSteps` para incluir os passos de proximo_passo:

```typescript
// Antes
const completedSteps = ["complete_final", "flow_complete"];

// Depois
const completedSteps = [
  "complete_final",
  "flow_complete",
  "complete_visit",
  "complete_questions",
  "complete_analyze",
  "proximo_passo",
  "proximo_passo_reminded",
];
```

Essa mesma lista `completedSteps` e usada em dois lugares:
1. Na contagem de orcamentos (ja existente) -- nao precisa mudar
2. Na filtragem de `incompleteLeads` -- e onde a correcao importa

Separar em duas listas para manter a logica correta:
- `completedBotSteps` (para contagem de orcamentos): mantem `["complete_final", "flow_complete"]`
- `completedOrPendingSteps` (para filtro de incompletos): inclui os passos de proximo_passo e complete_*

```typescript
const completedOrPendingSteps = [
  "complete_final", "flow_complete",
  "complete_visit", "complete_questions", "complete_analyze",
  "proximo_passo", "proximo_passo_reminded",
];

const incompleteLeads = (todayLeads || [])
  .map((lead) => {
    const conv = convMap.get(lead.id);
    const step = conv?.bot_step || null;
    if (!step) return null;
    if (completedOrPendingSteps.includes(step)) return null;
    // ...resto da logica
  })
  .filter(Boolean);
```

**Deploy**: Redeployar a edge function `daily-summary`.

