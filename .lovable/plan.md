

## Tornar Follow-ups Dinamicos + Nova Aba "Follow-ups" na Inteligencia

### O que muda

Atualmente, os follow-ups na tela de Inteligencia aparecem agrupados por tempo fixo ("24h", "48h"). O problema e que cada buffet configura tempos diferentes (ex: 72h, 96h, 144h). A proposta e:

1. **Renomear para "1o Follow-up", "2o Follow-up", "3o Follow-up", "4o Follow-up"** em vez de usar horas
2. **Criar uma nova aba "Follow-ups"** na pagina de Inteligencia com 4 colunas estilo Kanban (igual Prioridades), onde leads se movem conforme recebem cada follow-up
3. **Atualizar metricas e labels** para usar a nomenclatura por etapa em vez de horas

---

### Mudancas visuais

```text
+--------------------+--------------------+--------------------+--------------------+
| 1o Follow-up       | 2o Follow-up       | 3o Follow-up       | 4o Follow-up       |
| (72h)  [3 leads]   | (96h)  [2 leads]   | (144h) [1 lead]    | (192h) [0 leads]   |
+--------------------+--------------------+--------------------+--------------------+
| Lead A             | Lead C             | Lead E             |                    |
|   Score: 45        |   Score: 30        |   Score: 15        | Nenhum lead nesta  |
|   Morno            |   Frio             |   Frio             | etapa              |
|   [WhatsApp]       |   [WhatsApp]       |   [WhatsApp]       |                    |
| Lead B             | Lead D             |                    |                    |
+--------------------+--------------------+--------------------+--------------------+
```

- Cada coluna mostra o numero do follow-up e entre parenteses o tempo configurado pelo buffet
- Cores: Verde (1o), Azul (2o), Laranja (3o), Vermelho (4o) -- mesmas cores dos badges existentes
- Leads com link direto para o WhatsApp e resumo de IA inline

---

### Plano tecnico

**1. Edge Function `daily-summary/index.ts`**
- Buscar tambem `follow_up_3_delay_hours` e `follow_up_4_delay_hours` do `wapi_bot_settings`
- Adicionar acoes de follow-up 3 e 4 na lista `FOLLOW_UP_ACTIONS`
- Expandir metricas para incluir `followUp3` e `followUp4`
- Mudar labels de "72h" para "1o Follow-up (72h)" etc.
- Retornar `followUpLabels` com os 4 valores de delay

**2. Hook `useDailySummary.ts`**
- Expandir `DailyMetrics` para incluir `followUp3` e `followUp4`
- Expandir `FollowUpLabels` para incluir `fu3` e `fu4`
- Atualizar `aggregateResults` para somar os novos campos

**3. Componente `ResumoDiarioTab.tsx`**
- Atualizar `MetricsGrid` para mostrar 4 metricas de follow-up com labels "1o FU", "2o FU", "3o FU", "4o FU" (mostrando horas entre parenteses)
- Atualizar `FollowUpLeadsSection` para agrupar por numero de follow-up em vez de horas
- Atualizar contagem na aba "Follow-ups" para incluir todos os 4

**4. Nova aba "Follow-ups" na pagina `Inteligencia.tsx`**
- Adicionar botao "Follow-ups" no seletor de abas (entre "Prioridades" e "Funil")
- Buscar dados de `lead_history` para identificar em qual etapa de follow-up cada lead esta
- Passar dados para o novo componente

**5. Novo componente `FollowUpsTab.tsx`**
- Layout em 4 colunas (estilo identico ao `PrioridadesTab`)
- Cada coluna: "1o Follow-up", "2o Follow-up", "3o Follow-up", "4o Follow-up"
- Subtitulo mostrando o tempo configurado (ex: "72h")
- Cores das bordas: verde, azul, laranja, vermelho
- Cada lead mostra: nome, score, temperatura, status, ultimo contato, botao WhatsApp, resumo IA
- Leads sao filtrados para mostrar apenas leads ativos (nao fechados/perdidos) que receberam aquele follow-up especifico mas nao responderam ainda

**6. Hook de dados para a aba Follow-ups**
- Buscar do `lead_history` as acoes de follow-up por lead
- Buscar os delays configurados do `wapi_bot_settings` da empresa atual
- Cruzar com dados de `lead_intelligence` para enriquecer com score/temperatura
- Classificar cada lead na coluna do ultimo follow-up recebido

---

### Arquivos que serao modificados

| Arquivo | Tipo de mudanca |
|---|---|
| `supabase/functions/daily-summary/index.ts` | Buscar 4 follow-ups, expandir metricas e labels |
| `src/hooks/useDailySummary.ts` | Novos campos em DailyMetrics e FollowUpLabels |
| `src/components/inteligencia/ResumoDiarioTab.tsx` | 4 metricas FU, labels por numero |
| `src/components/inteligencia/FollowUpsTab.tsx` | **Novo arquivo** -- Kanban de 4 colunas |
| `src/pages/Inteligencia.tsx` | Nova aba "Follow-ups" no seletor |

