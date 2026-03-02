

## Corrigir envio de audio - Edge Function retornando 400

### Problema
O envio de audio esta falhando com status 400 porque:

1. O `send-audio` na Edge Function converte o audio de URL para base64 puro, mas a W-API espera o base64 com prefixo `data:audio/...;base64,...` (igual ao `send-image` que ja faz isso na linha 561-563)
2. Alem disso, o `send-image` ja tem logica para enviar direto por URL quando disponivel (mais eficiente), mas o `send-audio` nao tem esse caminho

### Solucao

**Arquivo: `supabase/functions/wapi-send/index.ts`**

Modificar o case `send-audio` para seguir o mesmo padrao do `send-image`:

1. **Priorizar envio por URL diretamente** -- se `audioMediaUrl` existe, enviar a URL para a W-API sem converter para base64. A W-API suporta receber URLs de audio da mesma forma que imagens. Isso evita problemas de memoria e tamanho de base64.

2. **Se base64 for usado, adicionar o prefixo `data:`** -- caso o audio venha como base64 (sem URL), garantir que tenha o prefixo `data:audio/ogg;base64,...` antes de enviar para a W-API. Atualmente o codigo envia base64 puro sem prefixo, o que a W-API rejeita.

3. **Adicionar log de erro** -- incluir `console.error` quando o envio falhar para facilitar debug futuro.

### Codigo proposto

```text
case 'send-audio': {
  const { base64: audioBase64, mediaUrl: audioMediaUrl } = body;
  
  let audioPayload: Record<string, any> = { phone };
  
  // Prefer sending by URL directly (same pattern as send-image)
  if (audioMediaUrl && !audioBase64) {
    console.log('send-audio: sending by URL:', audioMediaUrl.substring(0, 80));
    audioPayload.audio = audioMediaUrl;
  } else if (audioBase64) {
    let finalAudio = audioBase64;
    if (!finalAudio.startsWith('data:')) {
      finalAudio = `data:audio/ogg;base64,${finalAudio}`;
    }
    audioPayload.audio = finalAudio;
  } else if (audioMediaUrl) {
    // Fallback: fetch and convert to base64 with prefix
    const audioRes = await fetch(audioMediaUrl);
    const buf = await audioRes.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 32768) {
      const chunk = bytes.subarray(i, Math.min(i + 32768, bytes.length));
      bin += String.fromCharCode.apply(null, Array.from(chunk));
    }
    audioPayload.audio = `data:audio/ogg;base64,${btoa(bin)}`;
  } else {
    return error response;
  }

  // Send via W-API
  const res = await wapiRequest(send-audio endpoint, ...audioPayload);
  
  if (!res.ok) {
    console.error('send-audio failed:', res.error);
    return error response;
  }
  // ... rest stays the same (save message, update conversation)
}
```

### Resumo das mudancas

- **Edge Function (`wapi-send/index.ts`)**: Reescrever o bloco `send-audio` para enviar audio por URL diretamente (evitando conversao base64), seguindo o mesmo padrao ja usado pelo `send-image`. Se base64 for necessario, adicionar prefixo `data:audio/ogg;base64,` que a W-API exige.
- **Nenhuma mudanca no frontend** -- o `WhatsAppChat.tsx` ja envia `mediaUrl` corretamente.
