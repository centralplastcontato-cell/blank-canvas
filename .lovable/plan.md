
## Corrigir prioridade de classificacao: status real > proximo_passo do bot

### Problema
A Janaina tem status `em_contato` (visita agendada - acao manual/real) mas o `proximo_passo` do bot e "Tirar duvidas". A logica atual verifica o `proximo_passo` primeiro, entao ela e contada como "Querem humano" (5) em vez de "Visitas agendadas" (0).

O status do CRM (`em_contato`) representa uma acao real que aconteceu, enquanto o `proximo_passo` do bot e apenas a resposta automatica inicial. O status real deve ter prioridade.

### Correcao

**Arquivo: `supabase/functions/daily-summary/index.ts`** (linhas 230-257)

Inverter a ordem da logica de classificacao:
1. Primeiro verificar se o status do lead e `em_contato` - se sim, contar como visita (independente do proximo_passo)
2. Somente depois verificar o `proximo_passo` do bot para leads que NAO tem status `em_contato`

```text
ANTES:
  proximo_passo "agendar" -> visita
  proximo_passo "pensar"  -> pensar
  proximo_passo "duvida"  -> humano
  fallback: status em_contato -> visita   <-- nunca alcancado se tem proximo_passo

DEPOIS:
  status em_contato -> visita (PRIORIDADE - acao real)
  proximo_passo "agendar" -> visita
  proximo_passo "pensar"  -> pensar
  proximo_passo "duvida"  -> humano
```

### Resultado esperado
Para o dia 14/02:
- Visitas agendadas: 1 (Janaina)
- Querem humano: 4 (era 5, menos a Janaina)
- Demais metricas permanecem iguais

Apos a implementacao, basta clicar "Regerar" na data 14/02 para atualizar o snapshot.
