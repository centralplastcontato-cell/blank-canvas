

## Diagnóstico

Inconsistência de ticks (1✓, 2✓✓, nenhum, ou 2✓✓ azul prematuro) tem 4 causas reais no código:

**1. Status inicial nem sempre é gravado**  
Algumas mensagens são inseridas em `wapi_messages` sem `message_id` (envios via Z-API que não retornam ID, ou via webhook delivery sem chave). Sem `message_id`, o webhook `messageStatus` da W-API não consegue casar e atualizar → fica em `sent` para sempre, ou pior, com status null (mostra relógio ⏰).

**2. Mapeamento de status aceita `PLAYED` como `read`**  
Em `wapi-webhook/index.ts` linha 4938: `'PLAYED': 'read'`. Para áudio isso faz sentido, mas a W-API às vezes envia `PLAYED` em outros contextos, marcando mensagens como lidas indevidamente (✓✓ azul antes da hora).

**3. Race no `webhookDelivery`**  
Quando o usuário envia pelo celular físico (fora da plataforma), o webhook `webhookDelivery` insere a mensagem com `status: 'sent'` e, logo em seguida, dentro do mesmo handler, faz `UPDATE` com o `ack` que vier no payload. Se o payload já trouxer `ack=4` (mensagem antiga re-entregue), aparece como ✓✓ azul instantaneamente, sem o destinatário ter visto.

**4. Status `unknown` não é tratado**  
Linha 4939-4940: se a W-API enviar um valor de status fora do mapa, o código simplesmente ignora (`'unknown'` → não atualiza). A mensagem fica congelada no estado anterior.

## Plano de correção

**A. Garantir status inicial sempre presente**  
- Toda inserção em `wapi_messages` com `from_me: true` deve gravar `status: 'pending'` (não `'sent'`) quando ainda não há confirmação da W-API, e `'sent'` somente após a API confirmar o envio (HTTP 200 com messageId).
- Se não houver `message_id` no retorno, gravar `status: 'sent'` mas marcar metadado `no_ack_tracking: true` para a UI exibir 1✓ definitivo (sem expectativa de evolução).

**B. Corrigir mapeamento `PLAYED`**  
- Remover `'PLAYED': 'read'` do mapa genérico.
- Tratar `PLAYED` apenas quando `message_type === 'audio'`. Para outros tipos, ignorar.

**C. Eliminar race no `webhookDelivery`**  
- No handler `webhookDelivery` (linha ~4918): ao inserir mensagem nova proveniente do celular físico, **não** rodar o bloco de update de status logo em seguida (linhas 4938-4940). O status inicial deve ser apenas `'sent'` e os updates virão de webhooks `messageStatus` subsequentes.
- Adicionar guarda: o update de status só roda se a mensagem **já existia** antes (`em` é truthy na linha 4855).

**D. Tratar status `unknown`**  
- Quando `ns === 'unknown'`, logar o payload completo (debug) em vez de ignorar silenciosamente.
- Adicionar mapeamentos comuns que faltam: `'SERVER_ACK'`, `'DELIVERY_ACK'`, `'READ_SELF'`, etc.

**E. Fallback visual no frontend**  
- Em `WhatsAppChat.tsx` linha ~2568-2574: se `status` for null/undefined **e** a mensagem tem mais de 30 segundos, mostrar 1✓ (assumir entregue ao servidor) em vez de relógio eterno.

## Pontos técnicos

- **Arquivos a editar**: `supabase/functions/wapi-webhook/index.ts` (mapeamento e race), `supabase/functions/wapi-send/index.ts` (status inicial), `src/components/whatsapp/WhatsAppChat.tsx` (fallback visual).
- **Sem migration de DB necessária** — só lógica.
- **Sem risco de quebrar a conexão WhatsApp** — não estamos mexendo em conexão, instâncias ou webhooks de configuração, apenas no parse de payloads de status (respeita a regra `constraints/whatsapp-integration-safety`).
- **Não afeta mensagens já existentes** — a correção só age em novas mensagens daqui pra frente. Mensagens antigas continuarão com o status que tiverem.

## O que o cliente verá depois

- ⏰ relógio aparece só nos primeiros segundos (mensagem realmente em trânsito).
- ✓ um check assim que a W-API confirma envio (sempre).
- ✓✓ cinza quando o WhatsApp do destinatário recebe.
- ✓✓ azul **somente** quando o destinatário realmente abre a conversa.
- Sem mais "✓✓ azul instantâneo" enganoso.

