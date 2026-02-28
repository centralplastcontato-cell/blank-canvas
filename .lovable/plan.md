

## Correção: Mensagens não chegam nos grupos de WhatsApp

### Causa raiz

A função `sendTextWithFallback` no edge function `wapi-send` (linha 177) faz:

```text
const phone = String(rawPhone || '').replace(/\D/g, '');
```

Isso transforma `120363023108143216@g.us` em apenas `120363023108143216`, e depois tenta enviar para `120363023108143216@s.whatsapp.net` (chat pessoal inexistente). A W-API aceita a requisição mas não entrega a mensagem.

### Solução

Detectar JIDs de grupo (`@g.us`) no início de `sendTextWithFallback` e usar `chatId` diretamente, pulando a normalização e os fallbacks de chat pessoal.

### Arquivo modificado

**`supabase/functions/wapi-send/index.ts`** -- apenas a função `sendTextWithFallback` (linhas 176-208)

### Alteração proposta

```typescript
async function sendTextWithFallback(instanceId: string, token: string, rawPhone: string, message: string) {
  // Detect group JIDs and send directly via chatId
  if (rawPhone && rawPhone.endsWith('@g.us')) {
    const endpoint = `${WAPI_BASE_URL}/message/send-text?instanceId=${instanceId}`;
    const groupAttempts = [
      { name: 'chatId+message', body: { chatId: rawPhone, message, delayTyping: 1 } },
      { name: 'chatId+text', body: { chatId: rawPhone, text: message, delayTyping: 1 } },
    ];
    for (const attempt of groupAttempts) {
      const res = await wapiRequest(endpoint, token, 'POST', attempt.body);
      if (res.ok) {
        const msgId = extractWapiMessageId(res.data);
        console.log(`[send-text] Group success [${attempt.name}] msgId=${msgId || 'NONE'}`);
        return { ok: true, data: res.data, attempt: attempt.name };
      }
      console.warn(`[send-text] Group failed [${attempt.name}]: ${res.error}`);
    }
    return { ok: false, error: 'Falha ao enviar para grupo (W-API)' };
  }

  // Original logic for personal chats (unchanged)
  const phone = String(rawPhone || '').replace(/\D/g, '');
  // ... rest of existing code unchanged ...
}
```

### Escopo de segurança

- Nenhuma alteração em conexão, QR code, webhook, status de instância ou tabela `wapi_instances`
- Apenas adiciona um bloco `if` no início de uma função utilitária de envio de texto
- O fluxo existente para chats pessoais permanece 100% inalterado
- A lógica de grupo usa `chatId` com o JID completo (`@g.us`), que é o formato nativo da W-API para grupos

### Nota adicional

O `ShareToGroupDialog` existente (compartilhar lead em grupo) também tem o mesmo problema -- envia `remoteJid` sem `action`. Mas isso é um bug separado que pode ser corrigido depois. A correção no edge function resolve para ambos os casos, pois o `chatId` com `@g.us` será preservado.
