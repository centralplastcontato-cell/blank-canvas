

## Diagnóstico Real

O problema **não era só o `opacity-100`**. Mesmo com `opacity-0` (ou `className=""`), o botão do `ConversationStatusActions` **continua ocupando espaço no DOM** (tem `p-1` + ícone de 12px). Ele fica invisível mas empurra o timestamp para fora da tela.

Na Trujillo funciona porque as conversas não têm `lead_id`, então o componente retorna `null` (não renderiza nada). Na Manchester, com leads vinculados, o botão renderiza invisível mas ocupando espaço.

## Correção

**Arquivo:** `src/components/whatsapp/WhatsAppChat.tsx`, linha 3372-3379

Esconder completamente o `ConversationStatusActions` no mobile usando `hidden md:inline-flex`:

```tsx
<ConversationStatusActions
  conversation={conv}
  linkedLead={conversationLeadsMap[conv.id] || null}
  userId={userId}
  currentUserName={currentUserName}
  onStatusChange={handleConversationLeadStatusChange}
  className="hidden md:inline-flex"
/>
```

Isso garante que no mobile o botão **não renderiza no layout** (display: none), e no desktop ele aparece normalmente no hover. O usuário mobile acessa o status ao abrir a conversa.

