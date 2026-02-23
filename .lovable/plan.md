

# Corrigir erro ao enviar coleção "Planeta Divertido"

## Problema identificado

Existem **dois caminhos de envio** de coleções de fotos no sistema:

1. **SalesMaterialsMenu.tsx (frontend)** - Ja corrigido para envio sequencial com delay de 1.5s
2. **wapi-webhook/index.ts (backend/bot)** - Linha 2564: ainda usa `Promise.all` para enviar todas as fotos em paralelo

Os logs confirmam que todas as 10 fotos do "Planeta Divertido" sao disparadas no mesmo segundo, sobrecarregando a W-API e causando o erro.

A colecao do Planeta Divertido tem **10 fotos**, o que e muito mais do que outras unidades, explicando por que o erro ocorre so nessa unidade.

## Solucao

### 1. Corrigir envio paralelo no webhook (wapi-webhook/index.ts)

Substituir o `Promise.all` (linha 2563-2567) por envio sequencial com delay:

```typescript
// ANTES (paralelo - causa erro):
await Promise.all(photos.map(async (photoUrl: string) => {
  const msgId = await sendImage(photoUrl, '');
  if (msgId) await saveMessage(msgId, 'image', '📷', photoUrl);
}));

// DEPOIS (sequencial com delay):
for (let i = 0; i < photos.length; i++) {
  const msgId = await sendImage(photos[i], '');
  if (msgId) await saveMessage(msgId, 'image', '📷', photos[i]);
  if (i < photos.length - 1) {
    await new Promise(r => setTimeout(r, 2000));
  }
}
```

### 2. Aumentar delay no SalesMaterialsMenu (seguranca extra)

Aumentar o delay de 1.5s para 2s no frontend e adicionar tratamento de erro por imagem individual para que uma falha nao interrompa o envio das demais:

```typescript
for (let i = 0; i < material.photo_urls.length; i++) {
  try {
    await onSendMedia(material.photo_urls[i], "image");
  } catch (err) {
    console.error(`[SalesMaterialsMenu] Erro na foto ${i+1}:`, err);
    // Continua enviando as proximas mesmo se uma falhar
  }
  if (i < material.photo_urls.length - 1) {
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}
```

### 3. Deploy da edge function

Redeployar `wapi-webhook` apos a correcao.

## Arquivos a editar

| Arquivo | Alteracao |
|---|---|
| `supabase/functions/wapi-webhook/index.ts` | Trocar `Promise.all` por loop sequencial (linha ~2564) |
| `src/components/whatsapp/SalesMaterialsMenu.tsx` | Aumentar delay para 2s e adicionar try/catch por imagem |

