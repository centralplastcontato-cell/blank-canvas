
## Correcao: W-API nao reconhece "chatId" para grupos

### Diagnostico

Os logs mostram claramente:
```
[send-text] Group failed [chatId+message]: O número de telefone ou ID do grupo é obrigatório.
[send-text] Group failed [chatId+text]: O número de telefone ou ID do grupo é obrigatório.
```

A W-API (api.w-api.app) nao aceita o campo `chatId` para envio de mensagens para grupos. A API rejeita o payload e retorna que "o numero de telefone ou ID do grupo e obrigatorio".

### Solucao

Expandir as tentativas de envio para grupos usando multiplos nomes de campo, similar ao que ja e feito para chats pessoais. A W-API provavelmente espera `phone` com o JID completo (`@g.us`), ou `groupId`, ou `number`.

### Alteracao

**Arquivo:** `supabase/functions/wapi-send/index.ts` (linhas 180-194)

Substituir as 2 tentativas atuais por uma lista mais abrangente:

```typescript
if (rawPhone && rawPhone.endsWith('@g.us')) {
  const groupAttempts = [
    { name: 'phone+message', body: { phone: rawPhone, message, delayTyping: 1 } },
    { name: 'phone+text', body: { phone: rawPhone, text: message, delayTyping: 1 } },
    { name: 'chatId+message', body: { chatId: rawPhone, message, delayTyping: 1 } },
    { name: 'chatId+text', body: { chatId: rawPhone, text: message, delayTyping: 1 } },
    { name: 'number+message', body: { number: rawPhone, message, delayTyping: 1 } },
    { name: 'groupId+message', body: { groupId: rawPhone, message, delayTyping: 1 } },
  ];
  // ... same loop logic
}
```

A logica de fallback ja existe -- tenta cada variante em sequencia e para na primeira que funcionar. Quando encontrarmos a variante correta, ela sera logada nos logs e poderemos otimizar depois.

### Escopo

- Apenas altera o bloco de tentativas para grupo dentro de `sendTextWithFallback`
- Nenhuma alteracao em conexao, webhook, instancias ou status
- O fluxo de chats pessoais permanece inalterado
- Redeploy da edge function `wapi-send` apos a alteracao
