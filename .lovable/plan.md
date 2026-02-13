
# Corrigir leads frios aparecendo em "Atender Agora"

## Problema
A funcao `recalculate_lead_score` marca `priority_flag = true` para leads com status `orcamento_enviado`, mesmo que o score seja baixo (<=20) e a temperatura seja "frio". Isso faz 168+ leads frios aparecerem na coluna "Atender Agora", que deveria mostrar apenas leads quentes/prontos.

## Solucao

### 1. Corrigir a funcao SQL `recalculate_lead_score`
Adicionar condicao para que `priority_flag` so seja `true` se o lead **nao for frio** (score > 20):

```text
-- Antes (linha 155-157):
IF v_score > 60 THEN v_priority := true; END IF;
IF v_conv IS NOT NULL AND (v_conv.bot_data->>'proximo_passo') = '1' THEN v_priority := true; END IF;
IF v_lead.status = 'orcamento_enviado' THEN v_priority := true; END IF;

-- Depois:
IF v_score > 60 THEN v_priority := true; END IF;
IF v_score > 20 AND v_conv IS NOT NULL AND (v_conv.bot_data->>'proximo_passo') = '1' THEN v_priority := true; END IF;
IF v_score > 20 AND v_lead.status = 'orcamento_enviado' THEN v_priority := true; END IF;
```

### 2. Adicionar filtro extra no componente React
No `PrioridadesTab.tsx`, filtrar "Atender Agora" para excluir leads frios como camada de seguranca:

```text
-- Antes:
const atenderAgora = activeLeads.filter(d => d.priority_flag);

-- Depois:
const atenderAgora = activeLeads.filter(d => d.priority_flag && d.temperature !== 'frio');
```

### 3. Recalcular os scores existentes
Executar novamente o recalculo para todos os leads para aplicar a nova logica.

## Resultado esperado
- "Atender Agora": apenas leads mornos, quentes ou prontos com priority_flag
- "Frios": todos os leads com score < 20 (independente de priority_flag)
- Leads com `orcamento_enviado` mas sem atividade recente ficam em "Frios" ate interagirem novamente

## Detalhes tecnicos
- Arquivo SQL: nova migration com `CREATE OR REPLACE FUNCTION recalculate_lead_score`
- Arquivo React: `src/components/inteligencia/PrioridadesTab.tsx` linha 56
- Recalculo via bloco PL/pgSQL iterando `campaign_leads`
