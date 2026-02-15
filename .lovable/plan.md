

## Corrigir mensagens automaticas invisiveis no chat

### Problema
Todas as mensagens automaticas (lembretes de proximo passo, follow-ups, follow-ups de inatividade) estao sendo inseridas no banco **sem `company_id`**. Isso acontece porque a query que busca os dados da instancia seleciona apenas `instance_id` e `instance_token`, mas o codigo tenta usar `instance.company_id` ao salvar a mensagem -- resultando em `NULL`.

A politica de seguranca (RLS) da tabela `wapi_messages` exige que `company_id` esteja presente para o usuario ver a mensagem. Resultado: as mensagens sao enviadas ao WhatsApp com sucesso, mas ficam **invisiveis** na interface do chat.

### Solucao
Adicionar `company_id` ao `SELECT` das queries de instancia em todos os pontos afetados da Edge Function `follow-up-check`.

### O que muda para o usuario
- Todas as mensagens automaticas (lembretes, follow-ups) passam a aparecer corretamente no chat
- As 24 mensagens automaticas ja existentes sem `company_id` serao corrigidas retroativamente com um UPDATE

### Detalhes tecnicos

**Arquivo: `supabase/functions/follow-up-check/index.ts`**

Tres queries precisam ser corrigidas -- todas mudam de:
```
.select("instance_id, instance_token")
```
Para:
```
.select("instance_id, instance_token, company_id")
```

Locais exatos:
1. **Linha ~199** - `processNextStepReminder` (lembrete de proximo passo)
2. **Linha ~428** - `processFollowUp` (follow-up 1 e 2)
3. **Linha ~616** - `processInactiveFollowUp` (follow-up de inatividade)

A linha ~852 ja inclui `company_id` corretamente.

**Correcao retroativa (SQL)**:
```sql
UPDATE wapi_messages m
SET company_id = c.company_id
FROM wapi_conversations c
WHERE m.conversation_id = c.id
  AND m.company_id IS NULL
  AND m.metadata IS NOT NULL
  AND m.metadata::text != 'null';
```

**Deploy**: Redeployar a edge function `follow-up-check`.

