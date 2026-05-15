# Aviso visual de resposta a campanha

## Objetivo
Quando um lead que recebeu uma campanha responder no WhatsApp, mostrar um destaque visual na conversa (lista de chats) para que qualquer vendedor da unidade veja imediatamente. Vale para **qualquer resposta**, mesmo que a campanha não tenha ativado "pausar bot ao responder".

## Estado atual (já funciona parcialmente)
- `campaign-mark-conversation` marca `bot_data.campaign_pending_reply` na conversa.
- Webhook (linhas 5505-5575) detecta a resposta, cria `notifications` tipo `campaign_reply` para todos os usuários da empresa, e grava `bot_data.campaign_replied_at`.
- **Limitação:** só marca quando a campanha tem `pause_bot_on_reply = true`.

## Etapa 1 — Marcar a conversa em todas as campanhas (frontend)
Em `CampaignSenderContext.tsx` (linhas 178-186), remover a condição `if (campaign.pause_bot_on_reply)` e sempre invocar `campaign-mark-conversation`, passando um novo parâmetro `soft: true` quando o pause não está ativo.

## Etapa 2 — Modo "soft" no campaign-mark-conversation (edge function)
Aceitar parâmetro `soft`. Quando `soft = true`:
- Apenas grava `bot_data.campaign_pending_reply / campaign_lead_name / campaign_marked_at`.
- **Não** mexe em `bot_enabled` nem `bot_step` (deixa o bot funcionar normalmente).

E no webhook, ajustar bloco da linha 5505: quando `soft` (sem auto_reply_message e bot continua ligado), apenas criar a notificação + marcar `campaign_replied_at`, **sem** quebrar (`break`) o fluxo do bot. Para identificar o modo, salvar `campaign_soft: true` em `bot_data` na marcação.

## Etapa 3 — Badge na lista de conversas (frontend)
Na lista de conversas do WhatsApp (`ConversationList`/`ConversationItem`), exibir um badge laranja `📣 Respondeu campanha` quando `bot_data.campaign_replied_at` existe e ainda não foi "lido pelo vendedor". Critério para limpar:
- Quando o vendedor abre a conversa OU envia uma mensagem manual → limpar `campaign_replied_at` em `bot_data`.

## O que NÃO será alterado
- Lógica do bot, webhook de envio (`wapi-send`), realtime, autenticação, RLS.
- Schema de banco (tudo cabe em `bot_data` jsonb que já existe).
- Comportamento de `pause_bot_on_reply` para campanhas que já o usam.

## Validações
- Disparar campanha de teste sem `pause_bot_on_reply` → lead responde → badge aparece para todos os vendedores da unidade.
- Abrir a conversa → badge desaparece.
- Bot continua respondendo normalmente nas campanhas sem pause.
- Campanhas com `pause_bot_on_reply=true` continuam pausando como hoje.
