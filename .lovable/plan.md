

## Correcao: Bot respondendo diferente do configurado

### Diagnostico

O bot esta respondendo de forma diferente porque a flag `use_flow_builder` esta ativada (`true`) nas duas instancias do WhatsApp (Manchester e Trujillo). Isso faz o webhook ignorar completamente as perguntas fixas configuradas em `wapi_bot_questions` e usar o processador do Flow Builder, que le o fluxo "Fluxo de Boas-vindas" da tabela `conversation_flows`.

**Resumo do fluxo de decisao no webhook:**

```text
Mensagem recebida
  |
  v
processBotQualification()
  |
  v
use_flow_builder == true?
  |--- SIM --> processFlowBuilderMessage() (usa conversation_flows + flow_nodes)
  |--- NAO --> Bot fixo (usa wapi_bot_questions)
```

Atualmente ambas instancias estao no caminho "SIM", por isso o bot responde diferente do que esta configurado nas perguntas fixas.

### Solucao

Criar uma migracao SQL que desativa o `use_flow_builder` nas duas instancias:

```sql
UPDATE wapi_bot_settings
SET use_flow_builder = false
WHERE instance_id IN (
  '9b846163-9580-436b-a33e-1e0eca106514',
  '3f39419e-e7f5-4c3b-8ebd-1703e6c7a0c7'
);
```

Alem disso, limpar os estados do Flow Builder (`flow_lead_state`) para conversas que ainda estao no meio do fluxo, evitando que se o flow builder for reativado no futuro, leads fiquem "presos" em estados antigos:

```sql
UPDATE flow_lead_state
SET waiting_for_reply = false
WHERE flow_id = 'f0f00000-0000-0000-0000-000000000001'
AND waiting_for_reply = true;
```

### Impacto

- O bot voltara a usar as perguntas fixas configuradas em `wapi_bot_questions`
- Novas conversas serao processadas pelo bot fixo
- Conversas que ja estavam no meio do fluxo do Flow Builder terao o estado limpo
- Nenhuma alteracao de codigo necessaria -- apenas correcao de dados no banco

### Detalhes tecnicos

- **Tabela afetada**: `wapi_bot_settings` (2 registros)
- **Tabela secundaria**: `flow_lead_state` (limpeza de estados pendentes)
- **Arquivo relevante**: `supabase/functions/wapi-webhook/index.ts` (linha 821: condicional `use_flow_builder`)
- **Nenhum deploy necessario** -- a logica do webhook ja suporta ambos os modos

