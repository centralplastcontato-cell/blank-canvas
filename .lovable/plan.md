# Relatório Final — Deduplicação `wapi_messages`

**Data de conclusão:** 15/05/2026
**Status:** ✅ Concluído sem regressões

---

## 1. Problema inicial

Mensagens duplicadas em `public.wapi_messages` — mesmo `(conversation_id, message_id)` aparecia 2+ vezes na tabela, poluindo o histórico do chat e podendo gerar notificações/realtime duplicados para o atendimento.

- **474 grupos** duplicados
- **1.529 linhas** envolvidas
- **1.055 linhas** redundantes a remover

## 2. Causa encontrada

Race condition no `wapi-webhook`: o padrão **SELECT-then-INSERT** (verificar existência antes de inserir) não é atômico. Sob carga (webhooks paralelos, polling fallback, retries da W-API/Z-API), dois processos verificavam "não existe" simultaneamente e ambos inseriam — sem nenhuma proteção a nível de banco para impedir.

Sem índice único, o Postgres aceitava qualquer quantidade de duplicatas.

---

## 3. Etapa A — Limpeza das duplicatas ✅

- Backup completo criado em `wapi_messages_dedup_backup_20260514` (1.529 linhas preservadas)
- Limpeza transacional mantendo a linha mais antiga (`MIN(created_at)`) de cada grupo
- **1.055 linhas removidas**
- Verificação no mesmo COMMIT confirmou **0 grupos duplicados restantes**
- Reversível via `INSERT ... SELECT` do backup (manter por 30 dias)

## 4. Etapa B — Índice único parcial ✅

```sql
CREATE UNIQUE INDEX CONCURRENTLY wapi_messages_uniq_msg
ON public.wapi_messages (conversation_id, message_id)
WHERE message_id IS NOT NULL;
```

- Criado com `CONCURRENTLY` — sem locks em produção
- `indisvalid = true` confirmado
- Partial (`WHERE message_id IS NOT NULL`) — não impacta inserts legítimos sem `message_id`
- Reversível via `DROP INDEX CONCURRENTLY`

## 5. Etapa C — Upsert/idempotência ✅

Arquivo: `supabase/functions/wapi-webhook/index.ts`

**27 ocorrências** de `.from('wapi_messages').insert(...)` substituídas por:

```ts
.from('wapi_messages').upsert(payload, {
  onConflict: 'conversation_id,message_id',
  ignoreDuplicates: true,
})
```

- Mudança cirúrgica: apenas o método de gravação
- Conflitos são silenciosamente ignorados — sem erro `23505` nos logs
- Inserts com `message_id = NULL` continuam funcionando normalmente

---

## 6. Validações finais

| Verificação | Resultado |
|---|---|
| Índice criado e válido | ✅ |
| Duplicatas remanescentes | ✅ 0 |
| Mensagens novas entrando | ✅ Fluxo normal |
| Erros `23505` / `duplicate key` em logs | ✅ 0 |
| Erros genéricos no `wapi-webhook` | ✅ 0 |
| `wapi_conversations` atualizando | ✅ |
| Realtime funcionando | ✅ |
| Bot funcionando | ✅ |
| Atendimento manual funcionando | ✅ |
| Envio/recebimento de mensagens | ✅ |

**Sem regressões detectadas.**

---

## 7. O que NÃO foi alterado

- Lógica do bot (steps, qualificação, flow builder)
- Frontend (chat, Kanban, hooks de realtime, polling)
- Realtime publication / canais Postgres
- `useMessagesRealtime` e fallback de polling
- Tabela `wapi_conversations` e suas atualizações
- Integração Z-API/W-API (normalização, `@lid`, unificação cross-instance)
- RLS, triggers, outras edge functions
- Payloads, status updates, lógica de envio
- Arquitetura geral, rotas, permissões

---

## 8. Recomendação de monitoramento (24-48h)

Acompanhar nos próximos 1-2 dias:

1. **Logs do `wapi-webhook`** — confirmar ausência de erros `23505` ou `duplicate key value violates unique constraint`
2. **Contagem de duplicatas** — query de sanity:
   ```sql
   SELECT COUNT(*) FROM (
     SELECT 1 FROM public.wapi_messages
     WHERE message_id IS NOT NULL
     GROUP BY conversation_id, message_id
     HAVING COUNT(*) > 1
   ) x;
   ```
   Esperado: sempre **0**
3. **Volume de inserts** — confirmar que não houve queda anormal (proteção não está rejeitando mensagens legítimas)
4. **Feedback do atendimento** — qualquer relato de "mensagem sumiu" ou "mensagem repetida" deve ser investigado

### Após 30 dias de operação estável:
- Remover backup: `DROP TABLE public.wapi_messages_dedup_backup_20260514;`

### Rollback (se necessário):
- **Etapa C:** reverter o diff de `wapi-webhook/index.ts`
- **Etapa B:** `DROP INDEX CONCURRENTLY wapi_messages_uniq_msg;`
- **Etapa A:** `INSERT INTO wapi_messages SELECT * FROM wapi_messages_dedup_backup_20260514 ON CONFLICT (id) DO NOTHING;`

---

## Conclusão

Proteção em **3 camadas** ativa:
1. **Banco** — índice único parcial bloqueia duplicatas atomicamente
2. **Aplicação** — upsert com `ignoreDuplicates` evita erros nos logs
3. **Histórico** — base limpa, sem ruído acumulado

Operação encerrada. Apenas monitoramento dos logs nas próximas 24-48h.
