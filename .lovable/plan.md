

## Diagnóstico do Bug: Mensagens em Grupos Não Chegam no WhatsApp

### O que esta acontecendo

O problema é claro: quando um usuário envia uma mensagem pela plataforma para uma **conversa de grupo** (como "Convites" no seu exemplo), a mensagem aparece na interface da plataforma (update otimista), mas **não é entregue no WhatsApp real**.

### Causa raiz

No `WhatsAppChat.tsx`, todas as chamadas de envio usam `selectedConversation.contact_phone` como destino:

```typescript
phone: selectedConversation.contact_phone  // ex: "120363404198917681"
```

Para **grupos**, o identificador correto é o `remote_jid` que termina com `@g.us` (ex: `120363404198917681@g.us`).

A edge function `wapi-send` tem lógica especial para grupos -- ela detecta se o phone termina com `@g.us` e usa payloads específicos de grupo. Porém, como o frontend envia apenas o `contact_phone` (sem `@g.us`), a função trata como um número de telefone individual, normaliza removendo caracteres não-numéricos, e tenta enviar para `120363404198917681@s.whatsapp.net` -- que não existe como contato individual. A W-API retorna sucesso (aceita o request), mas a mensagem nunca chega.

### Impacto

Todas as ações de envio em conversas de grupo estão afetadas:
- `send-text` (mensagem de texto)
- `send-image` (imagem)
- `send-audio` (áudio)
- `send-video` (vídeo)
- `send-document` (documento)
- `send-contact` (contato)
- `edit-text` (edição)
- `send-reaction` (reação)

São ~10 pontos no `WhatsAppChat.tsx` que usam `contact_phone` em vez de `remote_jid`.

### Correção planejada

**Arquivo**: `src/components/whatsapp/WhatsAppChat.tsx`

Criar um helper que resolve o destino correto:

```typescript
const getConversationPhone = (conv: Conversation): string => {
  // Para grupos, usar remote_jid (que contém @g.us)
  if (conv.remote_jid?.endsWith('@g.us')) {
    return conv.remote_jid;
  }
  return conv.contact_phone;
};
```

Substituir todas as ~10 ocorrências de `phone: selectedConversation.contact_phone` e `phone: convPhone` (onde convPhone = contact_phone) por `phone: getConversationPhone(selectedConversation)`.

Isso fará com que a edge function `wapi-send` receba o JID completo do grupo e entre no branch correto de envio para grupos (linhas 179-198 do `wapi-send`).

A edge function **não precisa de alterações** -- ela já suporta envio para grupos quando recebe o JID com `@g.us`.

