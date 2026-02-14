

## Historico do Resumo Diario -- Persistencia e Comparacao

### O que muda para o usuario

- O Resumo do Dia passa a ter um **seletor de data** no topo, permitindo navegar por resumos de dias anteriores
- O resumo e salvo automaticamente no banco toda vez que e gerado, criando um historico completo
- No futuro, esse historico permitira comparacoes entre dias (ex: "hoje vs ontem", "esta semana vs semana passada")

### Detalhes tecnicos

**1. Nova tabela `daily_summaries`**

Armazena o snapshot completo de cada resumo gerado:

```text
daily_summaries
- id (uuid, PK)
- company_id (uuid, NOT NULL)
- summary_date (date, NOT NULL)
- metrics (jsonb) -- {novos, visitas, orcamentos, ...}
- ai_summary (text)
- timeline (jsonb) -- array de eventos
- incomplete_leads (jsonb) -- array de leads incompletos
- created_at (timestamptz)
- updated_at (timestamptz)
- UNIQUE(company_id, summary_date)
```

RLS: usuarios so veem resumos das suas empresas (mesmo padrao das outras tabelas).

**2. Edge Function `daily-summary` -- persistir ao gerar**

Apos montar o response, fazer um `UPSERT` na tabela `daily_summaries` usando `(company_id, summary_date)` como chave unica. Assim, cada nova geracao atualiza o registro do dia.

Adicionar suporte a um parametro opcional `date` no body. Se enviado, busca o resumo salvo no banco em vez de gerar um novo. Logica:

- Se `date` fornecido e diferente de hoje: busca registro da tabela e retorna
- Se `date` ausente ou igual a hoje: gera normalmente e salva (comportamento atual + persistencia)

**3. Hook `useDailySummary` -- aceitar data selecionada**

- Adicionar `selectedDate` como parametro do `fetchSummary`
- Se a data for diferente de hoje, enviar `{ company_id, date: "YYYY-MM-DD" }` no body
- Manter o comportamento atual para o dia de hoje

**4. Componente `ResumoDiarioTab` -- seletor de data**

- Adicionar um date picker no topo (usando o componente Calendar/Popover existente)
- Default: hoje. Ao selecionar outra data, chama `fetchSummary` com a data escolhida
- Desabilitar datas futuras
- Mostrar badge "Hoje" ou a data formatada

### Arquivos modificados

- **Nova migration SQL** -- tabela `daily_summaries` com RLS
- **`supabase/functions/daily-summary/index.ts`** -- upsert apos geracao + modo leitura por data
- **`src/hooks/useDailySummary.ts`** -- parametro `selectedDate`
- **`src/components/inteligencia/ResumoDiarioTab.tsx`** -- date picker no topo

### Beneficios futuros

Com o historico salvo, sera possivel implementar:
- Grafico de evolucao de metricas ao longo dos dias
- Comparativo "hoje vs ontem" ou "esta semana vs anterior"
- Relatorios semanais/mensais automaticos
