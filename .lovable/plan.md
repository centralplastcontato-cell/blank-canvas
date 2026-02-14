
## Aba "Não Completaram" no Resumo do Dia

Adicionar uma aba separada dentro do Resumo do Dia que lista os leads de hoje que **não completaram o fluxo do bot** (não receberam orçamento).

### O que muda para o usuário

O Resumo do Dia ganha duas sub-abas internas:
- **Visao Geral** (atual) -- metricas, insight da IA e timeline
- **Nao Completaram** (nova) -- lista dos leads do dia que pararam no meio do fluxo, mostrando nome, telefone, etapa onde pararam e quanto tempo faz

### Detalhes da lista "Nao Completaram"

Cada card mostra:
- Nome do lead
- WhatsApp (clicavel)
- Etapa do bot onde parou (ex: "Proximo passo", "Tipo de evento", "Boas-vindas")
- Tempo desde a ultima mensagem (ex: "ha 2h")
- Badge indicando se ja recebeu lembrete (`proximo_passo_reminded`) ou nao

### Implementacao tecnica

**1. Edge Function `daily-summary` -- retornar dados extras**

Adicionar ao response um campo `incompleteLeads` com a lista de leads criados hoje cujo `bot_step` NAO esta em `['complete_final', 'flow_complete']` (ou seja, nao receberam orcamento). Para cada lead retornar:
- `name`, `whatsapp`, `botStep` (label legivel), `lastMessageAt`, `isReminded` (se bot_step contem "reminded")

A query ja busca `todayLeads` e `conversations` -- basta filtrar e montar a lista.

**2. Hook `useDailySummary` -- tipar o novo campo**

Adicionar interface `IncompleteLead` e incluir `incompleteLeads: IncompleteLead[]` no `DailySummaryData`.

**3. Componente `ResumoDiarioTab` -- sub-abas**

Usar `Tabs` internamente com dois valores:
- `visao-geral`: conteudo atual (metricas + IA + timeline)
- `nao-completaram`: novo componente `IncompleteLeadsSection`

O componente `IncompleteLeadsSection` renderiza cards simples com as infos acima, organizados por etapa do bot. Mostra um contador no trigger da aba (ex: "Nao Completaram (9)").

**4. Metrica extra no grid**

Adicionar um 7o card de metrica: "Nao completaram" com icone `AlertTriangle` e cor vermelha, mostrando a contagem.

### Arquivos modificados

- `supabase/functions/daily-summary/index.ts` -- adicionar campo `incompleteLeads` ao response
- `src/hooks/useDailySummary.ts` -- adicionar tipo `IncompleteLead` e campo no `DailySummaryData`
- `src/components/inteligencia/ResumoDiarioTab.tsx` -- sub-abas + componente `IncompleteLeadsSection` + metrica extra
