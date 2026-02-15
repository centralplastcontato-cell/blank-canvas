

## Corrigir contagem de orcamentos no Resumo do Dia

### Problema

A metrica "Orcamentos" mostra 1, mas na verdade 2 leads receberam o PDF com orcamento hoje:

- **Amanda Tagawa** - `bot_step: complete_final` - contada corretamente
- **Amanda** - `bot_step: proximo_passo_reminded` - NAO contada

O fluxo do bot funciona assim:

```text
qualificacao (nome, tipo, mes, dia, convidados)
    |
    v
Bot envia PDF/orcamento    <-- orcamento ja foi enviado aqui
    |
    v
proximo_passo (pergunta: visita, duvidas, ou pensar)
    |
    v
complete_final (lead escolheu o proximo passo)
```

O lead no passo `proximo_passo` ou `proximo_passo_reminded` ja recebeu o orcamento, mas a logica atual so conta `complete_final` e `flow_complete`.

### Solucao

**Arquivo: `supabase/functions/daily-summary/index.ts`**

Na linha 181, expandir o array `completedBotSteps` para incluir os passos que indicam que o orcamento ja foi enviado:

```text
Antes:  ["complete_final", "flow_complete"]
Depois: ["complete_final", "flow_complete", "proximo_passo", "proximo_passo_reminded"]
```

Isso faz com que qualquer lead que ja passou pela fase de qualificacao e recebeu o PDF seja contado como "orcamento enviado", mesmo que ainda nao tenha escolhido o proximo passo.

### Impacto

- A metrica "Orcamentos" passara a refletir corretamente todos os leads que receberam o PDF
- Nenhum outro comportamento e afetado
- Deploy da edge function `daily-summary`

