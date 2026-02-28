

## Correcao: Ignorar mensagens com @lid no webhook

### O que muda

Uma unica linha de filtro adicionada no arquivo `supabase/functions/wapi-webhook/index.ts`, logo apos a normalizacao do `remoteJid` (por volta da linha 3482).

### Por que e seguro

- A correcao so adiciona um `break` quando o `remoteJid` contem `@lid`
- Nenhuma logica de conexao, status, QR code ou envio e alterada
- Nenhuma tabela e modificada
- Usuarios conectados continuam funcionando normalmente
- Mensagens reais (com `@s.whatsapp.net`) continuam sendo processadas

### Mudanca tecnica

No bloco `case 'message': case 'messages.upsert':`, apos a normalizacao do `rj` (linha ~3483), adicionar:

```text
// Ignore Meta Linked IDs (@lid) - they duplicate real messages
if ((rj as string).includes('@lid')) {
  console.log(`[Webhook] Ignoring @lid message: ${rj}`);
  break;
}
```

### Arquivo alterado

- `supabase/functions/wapi-webhook/index.ts` — 3 linhas adicionadas, 0 linhas removidas

### Impacto

- Trujillo: 23 conversas fantasma param de crescer imediatamente
- Planeta Divertido: 7 conversas fantasma param de crescer
- Manchester: 1 conversa fantasma para de crescer
- Conversas fantasma existentes permanecem no banco (limpeza separada se desejado)

