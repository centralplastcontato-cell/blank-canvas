

## Diagnóstico: Por que poucos leads aparecem no Follow-up

### Dados encontrados

| Empresa | Leads ativos | Escolheram "Analisar" | Receberam FU1 | Receberam FU2 |
|---------|-------------|----------------------|---------------|---------------|
| Castelo | 747 | 166 | 46 | 20 |
| Aventura | 26 | 6 | 3 | 0 |

Os números no painel **estão corretos** em relação aos dados -- mas o problema real é que **pouquíssimos follow-ups estão sendo enviados** comparado ao volume de leads.

### Causa raiz: Bug na janela de tempo do processamento

No `supabase/functions/follow-up-check/index.ts` (linha 428-429), o processamento de follow-ups usa uma **janela máxima fixa de 72h**:

```text
minTime = agora - 72h      (limite inferior fixo)
maxTime = agora - delayHours  (delay configurado)
```

Ambas as empresas têm **delay de 72h** para o 1º follow-up. Isso faz:
- FU1 (72h): janela = `agora-72h` até `agora-72h` → **janela de ~0 segundos**
- FU2 (144h): janela = `agora-72h` até `agora-144h` → **impossível** (início > fim)
- FU3 (216h): idem, **impossível**
- FU4 (288h): idem, **impossível**

O sistema só encontra leads que escolheram "Analisar com calma" **exatamente** no momento de 72h atrás. Os 46 que receberam FU1 provavelmente foram processados em momentos onde o timing coincidiu por sorte.

### Segundo problema: apenas leads que escolheram "Analisar"

O sistema de follow-up **só envia mensagens para leads que escolheram a opção "Analisar com calma"** no bot. Dos 747 leads ativos do Castelo, 519 estão em "Orçamento enviado" mas nunca escolheram "Analisar", então **nunca entram no funil de follow-up**. Isso significa que a maioria dos leads inativos simplesmente fica sem acompanhamento.

### Correção planejada

**Arquivo**: `supabase/functions/follow-up-check/index.ts`

1. **Corrigir a janela de tempo** (linhas 428-429): Trocar o `72h` fixo por uma janela dinâmica que garanta cobertura:
```text
minTime = agora - max(delayHours * 2, 168h)   // 2x o delay ou 7 dias, o que for maior
maxTime = agora - delayHours                    // delay configurado
```

2. **Ampliar o escopo de follow-up** (opcional, para decisão do usuário): Incluir leads que ficaram inativos em qualquer etapa do funil (não apenas os que escolheram "Analisar com calma"). Isso cobriria os 519 leads de "Orçamento enviado" que hoje não recebem nenhum follow-up.

### Decisão necessária

A correção 1 (janela de tempo) é urgente e deve ser implementada imediatamente. A correção 2 (ampliar escopo) é uma mudança de comportamento que pode gerar mensagens para muitos leads -- preciso saber se deseja incluí-la agora ou depois.

