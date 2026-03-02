

## Corrigir audio sumindo - URL assinada expirando

### Problema
Quando um audio e gravado e enviado:
1. O arquivo e enviado para o bucket privado `whatsapp-media`
2. Uma URL assinada com validade de **10 minutos** (600 segundos) e criada
3. Essa URL temporaria e passada para a Edge Function, que a usa para baixar o audio E salva essa mesma URL no banco de dados (`wapi_messages.media_url`)
4. Depois de 10 minutos, a URL expira e o audio aparece como "Arquivo nao disponivel" e eventualmente some

### Solucao

**Arquivo: `src/components/whatsapp/WhatsAppChat.tsx`** (linha 2364)

Trocar a validade da URL assinada de 600 segundos (10 minutos) para **31536000 segundos (1 ano)**. Essa URL e usada tanto para:
- A Edge Function baixar o arquivo e converter em base64 para enviar via W-API
- Ser salva na tabela `wapi_messages` como `media_url` para exibicao futura no chat

```text
Antes:
  .createSignedUrl(fileName, 600); // 10 min expiry

Depois:
  .createSignedUrl(fileName, 31536000); // 1 year expiry
```

Uma unica linha alterada. O audio continuara acessivel por 1 ano apos o envio, que e mais do que suficiente para o uso normal do sistema.

