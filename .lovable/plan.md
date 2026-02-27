

## Corrigir barra de resposta (quote) sumindo no chat

### Problema
Quando o usuario clica em "Responder" no menu de uma mensagem, a barra de pre-visualizacao da resposta aparece por um momento e depois desaparece sozinha.

### Causa raiz
No arquivo `WhatsAppChat.tsx`, o `prevConversationIdRef` (linha 910) e criado com valor `null` mas **nunca e atualizado** com o ID da conversa atual. Isso significa que o `useEffect` na linha 913, que depende de `[selectedConversation?.id]`, sempre encontra a condicao `prevConversationIdRef.current !== selectedConversation.id` como verdadeira (porque o ref permanece `null`).

Quando qualquer coisa causa o `selectedConversation?.id` a re-avaliar (por exemplo, uma atualizacao de estado no componente pai ou um evento realtime que provoca um re-render), o efeito re-executa e chama `setReplyingTo(null)` na linha 919, apagando a barra de resposta.

### Solucao

**Arquivo: `src/components/whatsapp/WhatsAppChat.tsx`**

1. **Atualizar o `prevConversationIdRef`** ao final do bloco de setup no `useEffect` da linha 913, para que o ref sempre tenha o ID da conversa atual:

```text
// Dentro do useEffect (apos a logica de setup, antes do fim)
prevConversationIdRef.current = selectedConversation.id;
```

2. **Mover `setReplyingTo(null)` para dentro do bloco condicional** que so executa quando a conversa realmente muda (ja esta correto na linha 919, dentro do `if`), garantindo que o `prevConversationIdRef` agora funcione como guard.

### Detalhe tecnico

A alteracao e de 1 linha adicionada no `useEffect` existente (linha ~959, antes do `}, [selectedConversation?.id]`):

```typescript
// Antes (linha 957-960):
} else {
  setLinkedLead(null);
}
}, [selectedConversation?.id]);

// Depois:
} else {
  setLinkedLead(null);
}
// Track current conversation ID to prevent unnecessary resets
prevConversationIdRef.current = selectedConversation?.id || null;
}, [selectedConversation?.id]);
```

Apenas 1 linha adicionada em 1 arquivo. Nenhuma outra alteracao necessaria.

