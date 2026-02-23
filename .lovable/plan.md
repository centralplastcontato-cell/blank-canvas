
# Corrigir envio de colecao de fotos - Planeta Divertido

## Problema

A colecao e enviada sequencialmente, os logs mostram 10 chamadas `send-image` sem erros, o toast confirma "Colecao enviada", mas apenas 1-2 fotos chegam no WhatsApp do destinatario. O problema esta no backend.

## Causa raiz identificada

Dois problemas no `wapi-send/index.ts`:

1. **Sem log de resposta para imagens**: O `send-text` tem `console.log('send-text response:', ...)` mas o `send-image` nao loga a resposta da W-API, impossibilitando detectar falhas silenciosas.

2. **Conversao para base64 desnecessaria**: O edge function baixa cada imagem e converte para base64 antes de enviar. Com 10 fotos grandes, isso sobrecarrega a memoria e pode gerar payloads que excedem o limite da W-API no plano LITE. A W-API aceita a requisicao (retorna 200) mas nao entrega a mensagem.

## Solucao

### 1. Enviar imagem por URL diretamente (wapi-send/index.ts)

A W-API suporta receber a imagem como URL ao inves de base64. Isso elimina o download + conversao no edge function:

```typescript
case 'send-image': {
  const { base64, caption, mediaUrl } = body;
  
  let imagePayload: Record<string, string> = { phone, caption: caption || '' };
  
  // Prefer sending by URL (avoids base64 size limits)
  if (mediaUrl && !base64) {
    imagePayload.image = mediaUrl; // W-API accepts URL directly
  } else {
    // Fallback to base64 for direct uploads
    let imageBase64 = base64;
    // ... existing base64 conversion logic ...
    imagePayload.image = imageBase64;
  }
  
  const res = await wapiRequest(...);
  console.log('send-image response:', JSON.stringify(res));
  // ... rest unchanged
}
```

### 2. Adicionar log de resposta (wapi-send/index.ts)

Adicionar `console.log('send-image response:', JSON.stringify(res))` apos a chamada da W-API para diagnosticar falhas silenciosas.

### 3. Aumentar delay para colecoes grandes (SalesMaterialsMenu.tsx)

Para colecoes com mais de 5 fotos, usar delay de 3 segundos ao inves de 2:

```typescript
const delay = material.photo_urls.length > 5 ? 3000 : 2000;
await new Promise(resolve => setTimeout(resolve, delay));
```

### 4. Deploy

Redeployar `wapi-send` apos as correcoes.

## Arquivos a editar

| Arquivo | Alteracao |
|---|---|
| `supabase/functions/wapi-send/index.ts` | Enviar imagem por URL + adicionar log de resposta |
| `src/components/whatsapp/SalesMaterialsMenu.tsx` | Delay dinamico para colecoes grandes |
