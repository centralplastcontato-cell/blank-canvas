

## Adicionar Tracking de Follow-ups ao Resumo Diario

### O que sera feito
Adicionar cards de metricas e uma nova aba para visualizar os follow-ups enviados no dia, separados por tipo (24h e 48h), com acesso direto ao lead.

### Mudancas

**1. Edge Function `supabase/functions/daily-summary/index.ts`**

Adicionar uma nova query na geracao do resumo para buscar follow-ups enviados no dia:
- Consultar `lead_history` com `action = 'Follow-up automatico enviado'` (1o follow-up) e `action = 'Follow-up #2 automatico enviado'` (2o follow-up) dentro da janela de data
- Para cada follow-up, buscar a instancia via `wapi_conversations` para saber se e 24h (Castelo) ou 48h (Manchester)
- Retornar no response um novo campo `followUps` com a lista de leads e seus tipos, alem de contadores `followUp24h` e `followUp48h` nas metricas

**2. Hook `src/hooks/useDailySummary.ts`**

Adicionar novas interfaces:
- `FollowUpLead`: nome, whatsapp, leadId, tipo (24h/48h), horario do envio
- Adicionar campos `followUp24h`, `followUp48h` no `DailyMetrics`
- Adicionar campo `followUpLeads` no `DailySummaryData`

**3. Componente `src/components/inteligencia/ResumoDiarioTab.tsx`**

- Adicionar 2 novos MetricCards no grid: "Follow-up 24h" (icone de relogio com cor azul) e "Follow-up 48h" (icone de relogio com cor indigo)
- Adicionar nova aba "Follow-ups" nas Tabs, ao lado de "Visao Geral" e "Nao Completaram"
- Na aba Follow-ups, mostrar a lista de leads separada em duas secoes (24h e 48h), cada card com:
  - Nome do lead
  - Horario do envio
  - Badge indicando "24h" ou "48h"
  - Botao para acessar o lead no atendimento

### Detalhes tecnicos

A separacao 24h vs 48h sera baseada na instancia do lead:
- Instancia Castelo (`3f39...`): follow-up 1 = 24h, follow-up 2 = 48h
- Instancia Manchester (`9b84...`): follow-up 1 = 48h, follow-up 2 = 96h

A query no edge function fara o JOIN entre `lead_history`, `campaign_leads` e `wapi_conversations` para determinar a qual instancia cada lead pertence e, combinado com o `action` (1o ou 2o follow-up), classificar como 24h ou 48h.

O grid de metricas passara de 7 para 9 cards (responsivo: 2 colunas mobile, 3 tablet, 9 desktop).

