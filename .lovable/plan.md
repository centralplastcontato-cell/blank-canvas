## Objetivo
Manter o destaque visual de "respondeu campanha" na lista do WhatsApp até o vendedor humano **realmente responder** ao lead. Apenas abrir a conversa não limpa mais o badge.

## Mudanças (apenas frontend, 1 arquivo)

**`src/components/whatsapp/WhatsAppChat.tsx`**

1. **`handleSelectConversation` (linhas 3645-3659)** — remover toda a lógica de limpeza. Vira só `setSelectedConversation(conv)`. Abrir a conversa não mexe mais em `bot_data.campaign_replied_at`.

2. **`handleSendMessage` (a partir da linha 2537)** — após o envio manual bem-sucedido pelo humano, se a conversa selecionada tiver `campaign_replied_at`, limpar `campaign_replied_at` / `campaign_replied_id` / `campaign_replied_name` do `bot_data`:
   - Atualiza estado local (`setConversations` + `setSelectedConversation`).
   - `update` no `wapi_conversations` com o `bot_data` limpo.
   - Best-effort (try/catch silencioso, não bloqueia envio).

## O que NÃO muda
- Webhook, edge functions, schema, RLS, lógica do bot.
- Renderização do badge laranja `📣 Campanha` continua igual (já lê `campaign_replied_at`).
- Notificação no sino e marcação inicial pela `campaign-mark-conversation` permanecem.

## Validação
- Lead responde campanha → badge laranja aparece para todos os vendedores.
- Vendedor abre a conversa → badge **continua** visível.
- Vendedor envia uma mensagem manual → badge desaparece (para todos via realtime do `wapi_conversations`).
