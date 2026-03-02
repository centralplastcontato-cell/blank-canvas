

## Corrigir mensagens salvas com conteudo vazio no webhook

### Problema
Quando o W-API envia eventos de sincronizacao de historico (history sync), as mensagens chegam em lote com payloads que nao contem o campo `message` no formato esperado. O `extractMsgContent` retorna `content: ""` e a mensagem e salva no banco sem conteudo, gerando bolhas vazias no chat.

Isso foi confirmado com a conversa da Nayara: 20+ mensagens recebidas no mesmo segundo, todas com `content: ""` e `message_type: "text"`.

### Solucao

**Arquivo: `supabase/functions/wapi-webhook/index.ts`**

Adicionar uma validacao apos a extracao de conteudo para rejeitar mensagens de texto com conteudo vazio. Mensagens de midia (imagem, video, audio, documento, etc.) podem ter conteudo como placeholder ("[Imagem]") e devem continuar passando normalmente.

### Mudanca especifica

Apos a linha 3511 (`let { type, content, url, key, path, fn, download, mime } = ext;`), adicionar:

```text
// Reject text messages with empty content (common in history sync events)
if (type === 'text' && !content.trim()) {
  console.log(`[Webhook] Skipping empty text message, msgId=${msgId}, phone=${phone}`);
  break;
}
```

### Por que funciona
- Mensagens de texto legitimas sempre tem `content` preenchido via `mc.conversation` ou `mc.extendedTextMessage.text`
- Mensagens de midia tem `type` diferente de `text` (image, video, audio, etc.) e nao sao afetadas
- History sync com payloads incompletos sao descartados silenciosamente em vez de gerar bolhas vazias
- Mensagens ja salvas no banco (as da Nayara) nao serao afetadas — isso so previne novas ocorrencias

### Limpeza dos dados existentes (opcional)
As mensagens vazias da Nayara ja estao no banco. Posso tambem limpar essas mensagens existentes com uma query de DELETE nas mensagens de tipo `text` com `content = ''`, caso deseje.

### Arquivos modificados
- `supabase/functions/wapi-webhook/index.ts` — adicionar validacao para rejeitar mensagens de texto vazias

