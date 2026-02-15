
## Corrigir Follow-up que nao alcanca todos os leads

### Problema identificado
O sistema tem 2 instancias WhatsApp com delays de follow-up diferentes:
- Instancia Castelo (3f39...) = 24h delay
- Instancia Manchester (9b84...) = 48h delay

A funcao `processFollowUp` busca leads na tabela `lead_history` SEM filtrar por instancia (linha 316-322). Depois, tenta encontrar a conversa do lead na instancia que esta sendo processada (linha 413-418). Leads cuja conversa esta na outra instancia sao ignorados com "No conversation found".

Exemplo real: Sandra Carvalho e Bruna escolheram "Analisar com calma" e suas conversas estao na instancia Manchester (48h). Quando a instancia Castelo (24h) processa, encontra elas na lead_history (ja passaram 24h), mas nao acha conversa nessa instancia. Quando Manchester processa, 48h ainda nao passaram, entao elas nao entram na janela. Resultado: nenhuma instancia envia o follow-up.

### Correcao tecnica

**Arquivo: `supabase/functions/follow-up-check/index.ts`**

Alterar a funcao `processFollowUp` para filtrar leads pela instancia correta ANTES de tentar enviar. A abordagem:

1. Apos buscar os `leadIds` da lead_history (linha 334), buscar as conversas desses leads filtradas pela instancia atual (`settings.instance_id`)
2. Manter apenas os leads que TEM conversa nessa instancia especifica
3. Isso garante que cada instancia so processa leads cujas conversas pertencem a ela, usando o delay correto

Mudanca no codigo (em torno das linhas 334-396):

```
// Apos obter leadIds da lead_history...
const leadIds = analysisChoices.map(c => c.lead_id);

// NOVO: Filtrar apenas leads que tem conversa nesta instancia
const { data: instanceConversations } = await supabase
  .from("wapi_conversations")
  .select("lead_id")
  .in("lead_id", leadIds)
  .eq("instance_id", settings.instance_id);

const leadsInThisInstance = new Set(
  (instanceConversations || []).map(c => c.lead_id)
);
const filteredLeadIds = leadIds.filter(id => leadsInThisInstance.has(id));

// Continuar com filteredLeadIds em vez de leadIds...
```

Isso resolve o problema porque:
- Instancia Manchester (48h) so processa Sandra, Bruna e outros leads cujas conversas estao nela
- Instancia Castelo (24h) so processa leads cujas conversas estao nela
- Cada lead recebe o follow-up no timing correto da SUA instancia

### Resultado esperado
- Sandra Carvalho: recebera follow-up apos 48h (instancia Manchester)
- Bruna: recebera follow-up apos 48h (instancia Manchester)
- Karin, Priscila, Thaluani: receberao follow-up apos 24h (instancia Castelo)
- Todos os leads que escolheram "Analisar com calma" serao cobertos
