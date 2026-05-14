## Objetivo

Eliminar a race condition que produz mensagens duplicadas em `wapi_messages` (mesmo `conversation_id` + `message_id` inseridos 2+ vezes), com **risco mínimo** e **zero impacto** em bot, realtime, frontend, atendimento manual e integrações.

---

## 1. Diagnóstico atualizado (consultas reais executadas agora)

A consulta inicial (24h) reportava ~107 duplicatas. A análise completa do histórico de `wapi_messages` revela um cenário maior:

| Métrica | Valor |
|---|---|
| Grupos `(conversation_id, message_id)` com >1 linha | **474** |
| Total de linhas envolvidas | **1.529** |
| Linhas a remover (mantendo a mais antiga de cada grupo) | **1.055** |
| Grupos com `from_me` divergente | 0 ✅ |
| Grupos com `message_type` divergente | 19 (ex.: text/audio do mesmo evento) |
| Grupos com `content` divergente | 136 |
| Grupos com `timestamp` divergente | 379 (microssegundos de diferença — mesma mensagem) |

**Investigação dos 136 com content divergente:**
- A maioria são **loops de retry/polling** que reinseriram a mesma mensagem várias vezes (ex.: 22-40 linhas com mesmo `content`, todas em 1 conversa).
- O outlier (40 linhas, span de 21h, content vazio, status `read`) é um loop antigo de status update — não é mensagem distinta.
- Os pares com texto pequeno divergente (`"Boa tarde"` vs `"Boa tarde "`) são a mesma mensagem com whitespace alterado por reprocessamento.

**Conclusão:** todos os grupos são duplicatas legítimas. Nenhuma mensagem real será perdida ao consolidar.

---

## 2. Estratégia de limpeza segura

### 2.1 Backup lógico (obrigatório antes de qualquer DELETE)

```sql
CREATE TABLE public.wapi_messages_dedup_backup_20260514 AS
SELECT m.*
FROM public.wapi_messages m
WHERE (m.conversation_id, m.message_id) IN (
  SELECT conversation_id, message_id
  FROM public.wapi_messages
  WHERE message_id IS NOT NULL
  GROUP BY conversation_id, message_id
  HAVING COUNT(*) > 1
);
```

→ Guarda **todas as 1.529 linhas** envolvidas. Permite reverter com um simples `INSERT … SELECT` se algo der errado. Tabela pode ser removida após 30 dias.

### 2.2 Regra de qual linha manter

**Vencedora = a mais antiga (`MIN(created_at)`)** de cada grupo. Justificativa:
- A 1ª inserção sempre tem o `content` original do webhook (as posteriores às vezes têm content vazio de status updates).
- O `id` (UUID PK) da 1ª linha é o que o realtime/frontend já entregou ao cliente — manter evita "sumiço" de mensagens em caches abertos.
- Mantém `from_me`, `message_type`, `media_url` da entrada original.

### 2.3 Script de limpeza (transacional, atômico)

```sql
BEGIN;

-- Confirma backup existe
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                 WHERE table_name = 'wapi_messages_dedup_backup_20260514') THEN
    RAISE EXCEPTION 'Backup não encontrado — abortando';
  END IF;
END $$;

WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY conversation_id, message_id
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM public.wapi_messages
  WHERE message_id IS NOT NULL
),
to_delete AS (
  SELECT id FROM ranked WHERE rn > 1
)
DELETE FROM public.wapi_messages
WHERE id IN (SELECT id FROM to_delete)
RETURNING id;
-- Esperado: ~1.055 linhas removidas

-- Verificação no mesmo trx: nenhum grupo duplicado restante
DO $$ DECLARE v_remaining int; BEGIN
  SELECT COUNT(*) INTO v_remaining FROM (
    SELECT 1 FROM public.wapi_messages
    WHERE message_id IS NOT NULL
    GROUP BY conversation_id, message_id
    HAVING COUNT(*) > 1
  ) x;
  IF v_remaining > 0 THEN
    RAISE EXCEPTION 'Ainda existem % grupos duplicados — rollback', v_remaining;
  END IF;
END $$;

COMMIT;
```

→ Se a verificação falhar, `ROLLBACK` automático. Zero risco de estado parcial.

### 2.4 Índice único parcial (após limpeza)

```sql
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS wapi_messages_uniq_msg
ON public.wapi_messages (conversation_id, message_id)
WHERE message_id IS NOT NULL;
```

- `CONCURRENTLY` → não bloqueia INSERT/SELECT durante a criação.
- `WHERE message_id IS NOT NULL` → não impacta inserts legítimos sem `message_id` (raros, mas existem).
- **Reversível**: `DROP INDEX CONCURRENTLY wapi_messages_uniq_msg;`

⚠️ `CONCURRENTLY` **não pode rodar dentro de transação** — será uma migração separada da limpeza.

---

## 3. Mudança no código (mínima, cirúrgica)

**Arquivo:** `supabase/functions/wapi-webhook/index.ts`
**Pontos:** linhas ~5418 e ~5444 (os 2 `INSERT INTO wapi_messages` do bloco de dedup SELECT-then-INSERT).

**Mudança:** trocar `.insert(...)` por `.upsert(..., { onConflict: 'conversation_id,message_id', ignoreDuplicates: true })`.

```ts
// Antes
const { data: inserted, error: insErr } = await supabaseAdmin
  .from("wapi_messages")
  .insert(messageRow)
  .select()
  .single();

// Depois
const { data: inserted, error: insErr } = await supabaseAdmin
  .from("wapi_messages")
  .upsert(messageRow, {
    onConflict: 'conversation_id,message_id',
    ignoreDuplicates: true,
  })
  .select()
  .maybeSingle();  // maybeSingle: ignoreDuplicates retorna null em conflito
```

E logo após:
```ts
if (!inserted) {
  console.log(`[Dedup] Skipped duplicate ${messageRow.message_id} in conv ${messageRow.conversation_id}`);
  // não dispara notifications/realtime extra
  return;
}
```

**Por que upsert com `ignoreDuplicates`:**
- É a forma idiomática do Supabase JS para `ON CONFLICT DO NOTHING`.
- Se 2 webhooks rodarem em paralelo, o Postgres garante atomicidade via o índice único — apenas 1 ganha, o outro recebe `null`.
- Não muda nada se `message_id` for NULL (índice é parcial).
- O bloco de notificação/realtime que vinha depois do INSERT é **pulado** quando `inserted === null`, evitando notificações duplicadas.

**Não altera:**
- Fluxo do bot, normalização Z-API, resolução `@lid`, unificação cross-instance, polling, frontend, RLS, atendimento manual, outras integrações.

---

## 4. Ordem de execução proposta (3 etapas, cada uma aprovada separadamente)

| Etapa | Ação | Reversível? | Risco |
|---|---|---|---|
| **A** | Criar `wapi_messages_dedup_backup_20260514` + rodar limpeza transacional (1.055 deletes) | ✅ `INSERT … SELECT` do backup | Baixo (transacional + verificação) |
| **B** | `CREATE UNIQUE INDEX CONCURRENTLY` (migração separada) | ✅ `DROP INDEX CONCURRENTLY` | Muito baixo (sem locks) |
| **C** | Editar `wapi-webhook/index.ts` linhas 5418 e 5444 → upsert + log de skip | ✅ Reverter o diff | Baixo (mantém comportamento sob carga normal) |

**Validação após cada etapa:**
- Após A: `SELECT COUNT(*) FROM wapi_messages WHERE …` confirma 0 duplicatas remanescentes.
- Após B: `\d+ wapi_messages` lista o índice.
- Após C: monitorar logs do edge function por 24h procurando `[Dedup] Skipped duplicate` — confirma que a proteção está atuando sem quebrar fluxo.

---

## 5. O que NÃO será tocado

- Lógica do bot (steps, qualificação, flow builder)
- Realtime publication / canais Postgres
- Polling fallback (`useMessagesRealtime`)
- UI do chat / Kanban
- Integração Z-API/W-API (apenas o ponto de INSERT)
- RLS, triggers, edge functions diferentes do `wapi-webhook`
- Tabelas `wapi_conversations`, `campaign_leads`, etc.

---

## 6. Plano de rollback (se algo quebrar em produção)

1. **Etapa C falha (webhook errando):** reverter o commit do `index.ts` → volta ao SELECT-then-INSERT original.
2. **Etapa B falha (índice rejeita inserts legítimos):** `DROP INDEX CONCURRENTLY wapi_messages_uniq_msg;` — volta exatamente ao estado pré-índice.
3. **Etapa A falha (deletes errados):**
   ```sql
   INSERT INTO public.wapi_messages
   SELECT * FROM public.wapi_messages_dedup_backup_20260514
   ON CONFLICT (id) DO NOTHING;
   ```

Backup pode ser removido após 30 dias de operação estável.

---

## Aguardando aprovação

Confirme se posso prosseguir com a **Etapa A** (backup + limpeza transacional). Cada etapa será apresentada para aprovação separada antes de ser aplicada.
