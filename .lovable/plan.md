

## Corrigir Timeline do Resumo Diario

### Problema 1: Indice global em vez de local
A timeline atribui indices sequenciais a todos os eventos (alertas + eventos). Quando o usuario filtra por "Eventos", o indice do primeiro item aparece como "2" em vez de "1" porque o alerta ocupa o indice "1".

**Correcao**: No componente `ResumoDiarioTab.tsx`, re-indexar os eventos filtrados localmente para que sempre comecem do 1.

### Problema 2: Leads novos nao aparecem na timeline
Hoje 3 leads foram criados (Amanda, Amanda Tagawa, Elaine), mas apenas 1 evento aparece na timeline porque a tabela `lead_history` so registra acoes explicitas (mudancas de status, proximos passos). A criacao de leads nao gera entrada no historico.

**Correcao**: No edge function `daily-summary/index.ts`, adicionar os leads criados hoje como eventos sinteticos na timeline (tipo "lead_created"), com horario de criacao e nome do lead.

### Problema 3: Acao "Proximo passo escolhido" nao tem formatacao amigavel
A funcao `formatAction` no frontend nao reconhece a acao "Proximo passo escolhido" do banco, entao cai no fallback generico.

**Correcao**: Adicionar tratamento para essa acao no `formatAction`.

---

### Mudancas tecnicas

**Arquivo 1: `supabase/functions/daily-summary/index.ts`**
- Antes de montar a timeline a partir do `lead_history`, inserir eventos sinteticos de tipo `lead_created` para cada lead criado hoje
- Cada evento sintetico tera: `action: "lead_created"`, `leadName`, `time` (horario de criacao em BRT)
- Mesclar com os eventos do historico e reordenar por horario

**Arquivo 2: `src/components/inteligencia/ResumoDiarioTab.tsx`**
- Na `TimelineSection`, usar indice local (posicao dentro do array filtrado) em vez do `event.index` global
- No `formatAction`, adicionar tratamento para `lead_created` ("novo lead recebido") e "Proximo passo escolhido"
- No `getActionIcon`, adicionar icone para `lead_created`

### Resultado esperado
A timeline mostrara:
1. 06:08 - Amanda - novo lead recebido
2. 10:08 - Amanda Tagawa - novo lead recebido  
3. 10:10 - Amanda Tagawa - proximo passo escolhido: Analisar com calma
4. 10:32 - Elaine - novo lead recebido

E na aba Alertas:
1. 04:24 - Amanda - sem resposta ha mais de 2h

