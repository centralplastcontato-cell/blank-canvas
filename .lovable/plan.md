
## Corrigir: Lead preso em "lp_sent" nao recebe follow-up

### Problemas identificados

**1. Follow-up nao funciona para leads no passo "lp_sent"**

A Elaine recebeu a mensagem do bot com seus dados e as opcoes (1 - Orcamento, 2 - Falar com atendente), mas nunca respondeu. O bot_step ficou como `lp_sent`. Porem, o sistema de follow-up para inativos (`processBotInactiveFollowUp`) so monitora estes passos:

```text
activeBotSteps = ["nome", "tipo", "mes", "dia", "convidados", "welcome"]
```

O passo `lp_sent` nao esta na lista, entao a Elaine nunca seria detectada como inativa.

**2. Lead_id nulo na conversa da Elaine**

A conversa da Elaine tem `lead_id: null`, o que pode impactar a contagem de metricas e o rastreamento geral.

### Solucao

**Arquivo: `supabase/functions/follow-up-check/index.ts`**

Adicionar `lp_sent` e `proximo_passo` (como fallback extra) a lista de `activeBotSteps` na funcao `processBotInactiveFollowUp`:

```text
Antes:  ["nome", "tipo", "mes", "dia", "convidados", "welcome"]
Depois: ["nome", "tipo", "mes", "dia", "convidados", "welcome", "lp_sent"]
```

Tambem adicionar um mapeamento de pergunta padrao para `lp_sent` no `DEFAULT_QUESTIONS_MAP`, para que o follow-up re-envie as opcoes:

```text
lp_sent: "Oi {nome}, ainda estou por aqui! Escolha a opcao que mais te agrada:
*1* - Receber agora meu orcamento
*2* - Falar com um atendente"
```

### O que muda para o usuario

- Leads que recebem a mensagem inicial com opcoes (1 - Orcamento, 2 - Atendente) e nao respondem passarao a receber um lembrete automatico apos o tempo configurado
- O comportamento para todos os outros passos continua identico

### Detalhes tecnicos

1. Na funcao `processBotInactiveFollowUp` (linha 588), adicionar `"lp_sent"` ao array `activeBotSteps`
2. No objeto `DEFAULT_QUESTIONS_MAP` (linha 667), adicionar entrada para `lp_sent` com as opcoes de orcamento/atendente
3. Deploy da edge function `follow-up-check`

### Sobre as metricas (orcamentos)

A contagem de orcamentos mostra 1 porque a logica conta leads com `bot_step: complete_final` mapeados por `lead_id`. A Elaine nao completou o fluxo (ainda esta em `lp_sent`) entao corretamente nao conta. A Amanda e a Priscila estao em `complete_final` -- mas se uma delas foi criada antes da meia-noite UTC, pode nao estar sendo incluida nos "leads de hoje". Isso e um comportamento esperado da janela de tempo (UTC vs BRT). A correcao do follow-up e mais urgente e pode ajudar a Elaine a completar o fluxo.
