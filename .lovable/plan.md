

## Fix: Bot nao reativa para leads que voltam pela LP

### Problema
Quando um lead que ja completou o fluxo do bot (bot_step = `complete_final`) faz uma nova submissao pela landing page, a mensagem de boas-vindas e enviada, mas o `bot_step` da conversa **nao e atualizado** para `lp_sent`. Quando o lead responde, o webhook ve `complete_final` e bloqueia a reativacao do bot.

### Causa raiz
A funcao `findOrCreateConversation` no `wapi-send` so cria conversas novas com `bot_step: 'lp_sent'`. Se a conversa ja existe, ela retorna o ID sem atualizar nada.

### Solucao
Duas mudancas:

**1. `supabase/functions/wapi-send/index.ts`**
- Adicionar um parametro opcional `lpMode` na chamada `send-text`
- Quando `lpMode: true` e a conversa ja existe, atualizar `bot_step` para `lp_sent` e `bot_enabled` para `true`
- Isso garante que o webhook saiba que ha uma nova interacao LP pendente

**2. `src/components/landing/LeadChatbot.tsx`**
- Na funcao `sendWelcomeMessage`, adicionar `lpMode: true` no body da chamada ao `wapi-send`
- Isso sinaliza que a mensagem vem da landing page e a conversa deve ser preparada para reativacao

### Detalhes tecnicos

No `findOrCreateConversation`, quando a conversa ja existe e `lpMode` esta ativo:

```
if (existing) {
  if (lpMode) {
    await supabase.from('wapi_conversations').update({
      bot_step: 'lp_sent',
      bot_enabled: true,
    }).eq('id', existing.id);
  }
  return { conversationId: existing.id, companyId: existing.company_id };
}
```

No `LeadChatbot.tsx`, na chamada ao edge function:

```
body: {
  action: 'send-text',
  phone: phoneWithCountry,
  message,
  unit: normalizedUnit,
  lpMode: true,  // sinaliza que e uma mensagem da LP
}
```

### Resultado
Quando um lead que ja passou pelo bot submete novamente pela LP, a conversa e resetada para `lp_sent`. Quando ele responde, o webhook processa normalmente: opcao 1 ativa o bot, opcao 2 transfere para atendente.
