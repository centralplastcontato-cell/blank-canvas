

# Correção: Reconexão automática e polling fallback para mensagens WhatsApp

## Problema
O hook `useMessagesRealtime` não reconecta após erro/timeout do canal Supabase Realtime. Quando o canal falha, ele é removido mas nunca recriado — o usuário fica sem receber mensagens até recarregar a página.

## Alterações

### 1. `src/hooks/useMessagesRealtime.ts` — Reconexão + Polling

**Reconexão automática:**
- Adicionar um estado `reconnectCounter` que, ao ser incrementado, força o `useEffect` a recriar o canal
- No handler de erro (`CHANNEL_ERROR`/`TIMED_OUT`), após 3s remover o canal e incrementar o counter

**Polling fallback (camada de segurança):**
- Polling com `setTimeout` recursivo começando em 5s
- Busca mensagens com `timestamp > último timestamp conhecido` (máx 50 registros)
- Deduplicação via `Set` de IDs já vistos (sincronizado com realtime)
- Backoff: se não encontra mensagens novas, aumenta intervalo até 15s; se encontra, volta para 5s
- Polling é leve e garante que mensagens apareçam em no máximo 5s mesmo se realtime falhar silenciosamente

### 2. `src/components/whatsapp/WhatsAppChat.tsx` — Safety net mais rápido

- Linha 918: reduzir debounce do safety net de `10000` para `5000`ms
- Isso faz a lista de conversas se atualizar mais rápido quando o realtime falha

## Segurança
- Zero risco para conexão WhatsApp — alterações são 100% frontend (leitura de dados e subscription Supabase)
- Nenhuma alteração em Edge Functions, webhooks, instâncias ou status de conexão
- Polling usa apenas `SELECT` na tabela `wapi_messages` com filtro por `conversation_id`

