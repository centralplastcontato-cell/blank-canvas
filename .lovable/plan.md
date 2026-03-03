

## Exibir Nome do Remetente em Mensagens de Grupo

### Problema
Nas conversas de grupo (@g.us), todas as mensagens aparecem sem identificacao de quem enviou. No WhatsApp Web, cada mensagem de grupo mostra o nome do remetente acima do conteudo.

### Causa Raiz
O webhook (`wapi-webhook`) **nao armazena** a informacao do remetente (participant) nas mensagens de grupo. O W-API envia `key.participant` (JID do remetente) e `pushName` (nome do remetente), mas esses dados sao ignorados no momento da insercao em `wapi_messages`.

### Solucao em 2 Partes

**Parte 1 — Backend: Salvar participant no webhook**

No `wapi-webhook/index.ts`, ao inserir mensagens de grupo, salvar `participant` e `pushName` no campo `metadata` (JSON) que ja existe na tabela:

```typescript
// Na insercao de wapi_messages (linhas ~3673-3686)
// Para grupos, adicionar metadata com sender info
const msgMetadata = isGrp ? {
  participant: (msg.key?.participant || msg.participant || '').replace('@s.whatsapp.net',''),
  sender_name: msg.pushName || msg.sender?.pushName || null
} : null;

// No insert:
metadata: msgMetadata,
```

**Parte 2 — Frontend: Exibir nome do remetente no chat**

No `WhatsAppChat.tsx`, na renderizacao de cada mensagem:
- Detectar se a conversa e grupo (`remote_jid` termina com `@g.us`)
- Se for grupo e `!from_me`, exibir `msg.metadata?.sender_name` ou o numero do participant acima do conteudo
- Usar cores distintas por remetente (hash do participant para cor)

```tsx
// Acima do conteudo da mensagem, dentro do bubble:
{isGroupConversation && !msg.from_me && (
  <p className="text-xs font-semibold mb-0.5" style={{ color: getSenderColor(msg.metadata?.participant) }}>
    {msg.metadata?.sender_name || msg.metadata?.participant || 'Desconhecido'}
  </p>
)}
```

### Arquivos Modificados
1. `supabase/functions/wapi-webhook/index.ts` — Extrair e salvar participant/pushName no metadata para mensagens de grupo
2. `src/components/whatsapp/WhatsAppChat.tsx` — Renderizar nome do remetente em bolhas de grupo

### Limitacao
Mensagens de grupo **ja salvas** antes desta mudanca nao terao o nome do remetente (metadata vazio). Apenas novas mensagens passarao a exibir o nome.

