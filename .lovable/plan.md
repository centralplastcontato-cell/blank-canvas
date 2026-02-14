
## Resumo Diario Inteligente - Nova aba na pagina de Inteligencia

### O que e
Uma nova aba **"Resumo do Dia"** na pagina de Inteligencia que mostra um briefing automatico com os principais numeros e insights gerados pela IA sobre o dia.

### Visualizacao proposta

O resumo sera dividido em 3 blocos:

**Bloco 1 - Numeros do Dia (cards rapidos)**
- Leads novos que chegaram hoje
- Quantos agendaram visita (status `em_contato`)
- Quantos querem pensar (proximo_passo = "3" / "Analisar com calma")
- Quantos pediram atendimento humano (proximo_passo = "2" / "Tirar duvidas")
- Quantos orcamentos foram enviados
- Taxa de conversao do dia (fechados / total)

**Bloco 2 - Insight da IA (gerado sob demanda)**
Um resumo textual gerado pelo GPT-4o-mini analisando os dados do dia. Exemplo:
> "Hoje entraram 8 leads. 3 agendaram visita (taxa acima da media). 2 estao pedindo para pensar -- considere um follow-up amanha. A Janaina tem score 45 e temperatura quente, merece atencao imediata. Nenhum lead esfriou hoje."

Inclui:
- Resumo geral do dia
- Destaques positivos (leads quentes, visitas agendadas)
- Alertas (leads esfriando, muitos "vou pensar")
- Sugestao de proximos passos para o time

**Bloco 3 - Timeline de eventos**
Lista cronologica dos eventos mais relevantes do dia:
- 09:15 - Janaina agendou visita para 18/02
- 10:30 - Pedro mudou de "frio" para "morno"
- 11:00 - Maria pediu orcamento
- 14:20 - Carlos esta sem responder ha 24h (alerta)

### Detalhes Tecnicos

**Frontend:**
- Novo componente `src/components/inteligencia/ResumoDiarioTab.tsx`
- Nova aba "Resumo do Dia" adicionada ao `TabsList` em `src/pages/Inteligencia.tsx`
- Cards de metricas usando o mesmo estilo dos MetricsCards existentes
- Bloco de IA com botao "Gerar Resumo do Dia" que chama uma Edge Function

**Edge Function:**
- Nova funcao `supabase/functions/daily-summary/index.ts`
- Recebe `company_id` e a data alvo
- Consulta `campaign_leads` (criados hoje), `lead_intelligence` (scores/temperaturas), `wapi_conversations` (bot_data para proximo_passo), e `lead_history` (eventos)
- Monta contexto e envia para GPT-4o-mini com prompt especifico para briefing diario
- Retorna JSON com `{ metrics, aiSummary, timeline }`

**Hook:**
- Novo hook `src/hooks/useDailySummary.ts` para gerenciar estado da chamada

**Dados utilizados (sem mudancas no banco):**
- `campaign_leads` - leads criados hoje, status
- `lead_intelligence` - score, temperatura, abandonment_type
- `wapi_conversations` - bot_data (proximo_passo), bot_step
- `lead_history` - eventos do dia para timeline
- Nenhuma nova tabela ou coluna necessaria

### Sequencia de implementacao
1. Criar a Edge Function `daily-summary`
2. Criar o hook `useDailySummary`
3. Criar o componente `ResumoDiarioTab`
4. Adicionar a nova aba na pagina Inteligencia
