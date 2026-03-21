

## Correção: Erro ao reagir com emoji no WhatsApp

### Problema
A W-API no plano LITE não suporta o endpoint de reações (retorna 403 "Acesso negado" / 404). A edge function `wapi-send` retorna HTTP 400 quando todas as tentativas falham, mas o `supabase.functions.invoke` trata qualquer status não-2xx como erro de rede, impedindo que a mensagem amigável chegue ao frontend.

### Solução
Duas alterações mínimas:

#### 1. Edge Function `supabase/functions/wapi-send/index.ts` (~linha 2140)
- Mudar o `status: 400` para `status: 200` na resposta de falha do `send-reaction`, retornando `{ success: false, error: "mensagem" }` em vez de HTTP 400
- Isso segue o padrão de estabilidade já adotado em outras ações da mesma edge function

#### 2. Frontend `src/components/whatsapp/WhatsAppChat.tsx` (~linha 2334-2339)
- Ajustar o handler `handleReaction` para verificar `response.data?.success === false` ou `response.data?.error` e exibir um toast informativo ("Reações não disponíveis neste plano") em vez do erro genérico
- Fechar o menu de contexto após a tentativa

### Resultado
Em vez do banner vermelho "Erro ao reagir — Edge Function returned a non-2xx status code", o usuário verá um toast discreto informando que reações não estão disponíveis no plano atual.

