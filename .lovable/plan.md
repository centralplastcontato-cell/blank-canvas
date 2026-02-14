

## Corrigir Metricas do Resumo Diario

### Problema
As metricas de "Orcamentos", "Visitas agendadas", "Vao pensar" e "Querem humano" estao erradas porque a Edge Function so conta leads **criados hoje** e verifica o status atual deles. Um lead criado ontem que recebeu orcamento hoje nao e contado.

Confirmei no banco: nenhuma mudanca de status para "Orcamento Enviado" aconteceu hoje -- as ultimas foram nos dias 9, 10 e 11/02. Portanto o "1" que aparece e apenas 1 lead criado hoje que ja esta com esse status, nao necessariamente um orcamento enviado hoje.

### Solucao
Mudar a logica da Edge Function `daily-summary` para contar eventos do dia usando **duas fontes**:

1. **Leads criados hoje** (para a metrica "Leads novos")
2. **Historico de mudancas de status hoje** (`lead_history`) para contar:
   - Orcamentos enviados = transicoes para `orcamento_enviado` ou `Orcamento Enviado` hoje
   - Visitas agendadas = transicoes para `em_contato` hoje
   - Fechados = transicoes para `fechado` hoje

Para "Vao pensar" e "Querem humano", manter a logica atual do `bot_data.proximo_passo` mas aplicar sobre **todos os leads com historico hoje**, nao apenas os criados hoje.

### Mudancas

**Arquivo: `supabase/functions/daily-summary/index.ts`**

- Buscar `lead_history` do dia com `action IN ('status_change', 'Alteracao de status')`
- Contar transicoes por `new_value` para cada metrica
- Combinar: "Leads novos" continua sendo contagem de `campaign_leads` criados hoje
- "Orcamentos" passa a ser contagem de transicoes para orcamento no dia
- "Visitas" passa a ser contagem de transicoes para em_contato no dia
- "Fechados" passa a ser contagem de transicoes para fechado no dia
- Taxa de conversao: fechados hoje / leads novos hoje

### Detalhes Tecnicos

A query de historico ja existe na funcao (para a timeline). A mudanca e usar esses mesmos eventos para calcular as metricas, em vez de depender apenas do status atual dos leads criados hoje.

Mapeamento de valores no historico (o `new_value` pode vir em formatos diferentes):
- Orcamento: `"orcamento_enviado"` ou `"Orçamento Enviado"`
- Visita: `"em_contato"` ou `"Em Contato"`
- Fechado: `"fechado"` ou `"Fechado"`

