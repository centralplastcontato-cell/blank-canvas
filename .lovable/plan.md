

## Plano: Retry automático no envio de mensagens WhatsApp

### O que muda

**Arquivo: `src/components/whatsapp/WhatsAppChat.tsx`**

Criar uma função helper `invokeWithRetry` que encapsula `supabase.functions.invoke` com retry automático. Será usada no envio de texto (linha ~1838) e contato (linha ~1910).

```tsx
// Helper no topo do componente ou fora dele
async function invokeWithRetry(
  body: Record<string, unknown>,
  maxRetries = 2,
  delayMs = 1500
) {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await supabase.functions.invoke("wapi-send", { body });
      // Se chegou aqui, a chamada de rede funcionou (pode ter erro lógico no response)
      return response;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  }
  throw lastError;
}
```

**Onde aplicar:**
1. **Envio de texto** (~linha 1838): trocar `supabase.functions.invoke("wapi-send", {...})` por `invokeWithRetry({...})`
2. **Envio de contato** (~linha 1910): mesma troca

Os demais envios (áudio, imagem, documento, vídeo) também podem ser migrados, mas o foco principal é texto e contato que são os mais usados.

### O que NÃO muda
- Nenhuma Edge Function
- Nenhuma instância W-API
- Nenhuma tabela do banco
- Apenas lógica frontend de retry no navegador

