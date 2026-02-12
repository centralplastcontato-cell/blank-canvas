
# Correção: Conversa com nova mensagem deve subir para o topo da lista

## Problema

A lista de conversas ja e ordenada por `last_message_at` quando os dados sao carregados e quando chega um evento em tempo real. Porem, o **sort final de exibição** (que roda antes de renderizar a lista) so ordena por favoritos, sem manter a ordem por data da ultima mensagem como criterio secundario.

## Solução

Ajustar o sort final da lista filtrada para:
1. Favoritos primeiro (como ja funciona)
2. Dentro de cada grupo (favoritos e nao-favoritos), ordenar por `last_message_at` decrescente (mais recente primeiro)

## Mudança

**Arquivo:** `src/components/whatsapp/WhatsAppChat.tsx`

Alterar o `.sort()` da lista filtrada (linhas 2308-2313) de:

```typescript
.sort((a, b) => {
  if (a.is_favorite && !b.is_favorite) return -1;
  if (!a.is_favorite && b.is_favorite) return 1;
  return 0;
});
```

Para:

```typescript
.sort((a, b) => {
  if (a.is_favorite && !b.is_favorite) return -1;
  if (!a.is_favorite && b.is_favorite) return 1;
  // Dentro do mesmo grupo, ordenar por ultima mensagem (mais recente primeiro)
  const timeA = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
  const timeB = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
  return timeB - timeA;
});
```

Isso garante que quando uma mensagem nova chega e o `last_message_at` e atualizado via realtime, a conversa sobe automaticamente para o topo da lista (respeitando favoritos acima).
