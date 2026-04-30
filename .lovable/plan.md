## Diagnóstico

Confirmado: na **W-API**, mensagens enviadas pelo celular do buffet chegam normalmente no webhook (evento `webhookReceived` com `fromMe: true`), por isso Vendas 2 funciona. Já na **Z-API** (Mega Magic, Vendas 3, Planeta Divertido), essas mensagens **não aparecem na plataforma** por dois motivos combinados:

### Causa 1 — Webhook "mensagem enviada" nunca foi configurado na Z-API
Em `supabase/functions/wapi-send/index.ts` (linhas 327–334), a função `zapiConfigureWebhooks` registra 7 webhooks, mas **falta o `update-webhook-message-sent`** (callback que a Z-API dispara quando o usuário envia algo pelo celular). Resultado: a Z-API simplesmente nunca chama nosso backend para essas mensagens.

### Causa 2 — Normalizador da Z-API só reconhece `ReceivedCallback`
Em `supabase/functions/wapi-webhook/index.ts` (linha 5287), a detecção é:
```
body.type === 'ReceivedCallback' || (body.phone && body.instanceId && !body.event && ...)
```
Mesmo que a Z-API estivesse mandando o `SendCallback` / payload de mensagem enviada, o webhook descartaria como "evento desconhecido" porque o `type` seria `SendCallback` (ou `MessageStatusCallback` para alguns formatos), não `ReceivedCallback`.

## Plano de correção

### 1. Registrar o webhook de mensagens enviadas na Z-API
Em `supabase/functions/wapi-send/index.ts`, dentro de `zapiConfigureWebhooks`, adicionar `update-webhook-message-sent` à lista de endpoints configurados. Isso passa a notificar nosso backend toda vez que o usuário envia uma mensagem pelo celular conectado à Z-API.

### 2. Reaplicar nas instâncias Z-API já conectadas
Como o webhook só é configurado no momento da conexão/reconexão, as 3 instâncias atuais (Mega Magic, Vendas 3, Planeta Divertido) precisam ter o webhook reconfigurado. Duas opções:
- **(a)** Disparar `configure-webhooks` programaticamente para cada instância Z-API conectada logo após o deploy (script único de manutenção, sem migração de dados).
- **(b)** Pedir reconexão manual via QR Code para cada uma.

Recomendo **(a)** — execução única, transparente, sem fricção para os buffets.

### 3. Aceitar `SendCallback` no normalizador
Em `wapi-webhook/index.ts`, ampliar a detecção `isZapiPayload` para incluir os tipos de callback de envio da Z-API:
```
body.type === 'ReceivedCallback' ||
body.type === 'SendCallback' ||
body.type === 'MessageStatusCallback' ||
(body.phone && body.instanceId && !body.event && (...))
```
A heurística por presença de `text/image/audio/video/document` já cobre o conteúdo — só faltava aceitar o `type`.

### 4. Garantir `fromMe` correto no payload normalizado
O `normalizeZapiPayload` já lê `body.fromMe === true` (linha 5228). Para `SendCallback`, a Z-API envia `fromMe: true` nativamente, então o restante do fluxo (`messages.upsert` → branch `fromMe`) já trata corretamente: salva como `from_me: true`, atualiza `last_message_from_me`, **não** incrementa `unread_count` e **desativa o bot** se estava ativo (comportamento esperado quando o atendente assume pelo celular).

### 5. (Opcional) Logar payload bruto de `SendCallback` por 24h
Adicionar um `console.log` específico quando `type === 'SendCallback'` para validarmos no Supabase Logs que o formato está exatamente como esperado antes de declarar resolvido.

## Arquivos afetados

- `supabase/functions/wapi-send/index.ts` — adicionar endpoint `update-webhook-message-sent` + lógica de reconfiguração em massa (rota administrativa one-shot).
- `supabase/functions/wapi-webhook/index.ts` — ampliar `isZapiPayload` para incluir `SendCallback` / `MessageStatusCallback` e adicionar log de debug.

## Validação

1. Após deploy, rodar a reconfiguração das 3 instâncias Z-API.
2. Pedir ao buffet Mega Magic para enviar uma mensagem de texto, um áudio e uma imagem pelo celular.
3. Conferir nos logs do `wapi-webhook` o evento chegando como `SendCallback` e a mensagem aparecendo na conversa do CRM com balão "enviado por mim".
4. Repetir para Vendas 3 e Planeta Divertido.

## Nota de segurança / regra de projeto

A memória do projeto exige **não modificar a lógica core de conexão WhatsApp**. As mudanças aqui são **aditivas**: adicionam um endpoint de webhook e ampliam um filtro de detecção — nenhuma rota existente é alterada, nenhuma instância W-API é afetada. Mantém o `wapi-send` como ponto único de envio.
