

## Cards de Follow-up com Labels Dinamicos

### Problema atual
Os cards "Follow-up 24h" e "Follow-up 48h" e a classificacao dos follow-ups estao hardcoded com base no ID da instancia (Castelo = 24h/48h, Manchester = 48h/96h). Se voce alterar os tempos nas configuracoes de automacao, os cards continuam mostrando "24h" e "48h".

### Solucao
Buscar os tempos reais configurados em `wapi_bot_settings` e usa-los tanto na classificacao quanto nos labels dos cards.

### Mudancas

**1. Edge Function `supabase/functions/daily-summary/index.ts`**

- Buscar `wapi_bot_settings` para todas as instancias da empresa, pegando `instance_id`, `follow_up_delay_hours` e `follow_up_2_delay_hours`
- Substituir a logica hardcoded (Castelo = 24h, Manchester = 48h) por lookup dos valores reais de cada instancia
- Classificar cada follow-up usando o delay real: ex. se Castelo tem `follow_up_delay_hours = 24`, o tipo sera "24h"; se Manchester tem `follow_up_delay_hours = 48`, sera "48h"
- Retornar no response um novo campo `followUpLabels` com os nomes unicos dos tipos encontrados (ex: `{ fu1: "24h", fu2: "48h" }` ou os valores que estiverem configurados)
- Agrupar as metricas por delay real em vez de categorias fixas

**2. Hook `src/hooks/useDailySummary.ts`**

- Adicionar campo `followUpLabels` na interface de retorno para receber os labels dinamicos do backend

**3. Componente `src/components/inteligencia/ResumoDiarioTab.tsx`**

- Usar os labels retornados pelo backend nos MetricCards em vez de "Follow-up 24h" / "Follow-up 48h" fixos
- Na aba Follow-ups, usar os mesmos labels dinamicos para nomear as secoes e badges
- Fallback para "24h" e "48h" caso o backend nao retorne os labels (compatibilidade)

### Resultado
Quando voce mudar o delay de follow-up de 24h para 12h nas configuracoes, o card automaticamente mostrara "Follow-up 12h". O mesmo para o segundo follow-up.
