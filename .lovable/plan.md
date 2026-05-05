Entendi o problema: nas três instâncias citadas o recebimento de mensagens do cliente está funcionando, mas há falha/intermitência nas mensagens enviadas direto pelo celular do buffet aparecerem no painel. Eu encontrei evidências de que são instâncias Z-API e que o webhook/normalização atual não está tratando corretamente todos os callbacks de mensagens enviadas pelo próprio celular, especialmente quando a Z-API manda dados como status ou `@lid` sem o conteúdo completo.

Plano para corrigir de vez:

1. Corrigir a configuração de webhooks da Z-API
   - Ajustar `supabase/functions/wapi-send/index.ts` para configurar `update-every-webhooks` com:
     - `value: <url do webhook>`
     - `notifySentByMe: true`
   - Corrigir também o endpoint específico de notificação de mensagens enviadas por mim, usando o corpo documentado pela Z-API:
     - `notifySentByMe: true`
   - Manter fallback para endpoints individuais, mas garantir que “Ao receber” + “notificar enviadas por mim” fique ativo, porque é isso que faz mensagens enviadas pelo celular chegarem com conteúdo.

2. Fortalecer o webhook para mensagens enviadas pelo celular
   - Ajustar `supabase/functions/wapi-webhook/index.ts` para não tratar `MessageStatusCallback` como se fosse mensagem sem conteúdo.
   - Tratar corretamente `DeliveryCallback`, `SendCallback` e eventos status apenas como status quando não houver conteúdo.
   - Quando houver payload Z-API com `fromMe=true` e conteúdo real, salvar como mensagem `from_me=true` na conversa correta.
   - Melhorar a resolução de `@lid` para evitar conversas “fantasma” com números LID, e priorizar conversa existente por telefone real quando disponível.

3. Evitar que mensagens fiquem escondidas por conversa duplicada
   - Para Planeta Divertido, Mega Magic e Vendas 3, revisar a lógica que encontra conversa por `remote_jid`/`contact_phone` para mesclar na conversa correta quando a Z-API alternar entre telefone real e `@lid`.
   - Se a mensagem chegar via `@lid` e houver conversa com telefone real na mesma instância/unidade, atualizar a conversa correta em vez de criar/usar thread separada.

4. Reaplicar webhooks nas três instâncias afetadas
   - Depois do ajuste, executar a reconfiguração pelo próprio `wapi-send` para:
     - Planeta Divertido: `3F253CB8EBD4E2872682E20FCC7E1DFA`
     - Mega Magic: `3ED9CA9C3AC8A1576D7672DB9E6DCBAA`
     - Castelo da Diversão Vendas 3: `3ECD35E5DF7B51A9AFA66A599C5ED5B8`
   - Isso é necessário porque o código corrigido sozinho não muda a configuração já salva no painel da Z-API.

5. Validar no banco e logs
   - Conferir nos logs do `wapi-webhook` se chegam callbacks de mensagens enviadas pelo celular com conteúdo.
   - Conferir em `wapi_messages` se novas mensagens de teste entram com `from_me=true` e aparecem na conversa correta.
   - Confirmar que não estão sendo salvas em uma conversa separada `@lid` invisível/confusa.

Arquivos que pretendo alterar:
- `supabase/functions/wapi-send/index.ts`
- `supabase/functions/wapi-webhook/index.ts`

Observação importante: eu não vou mexer na lógica central de conexão do WhatsApp além da configuração de webhooks necessária para esse problema. A correção é focada em: receber/salvar no painel o que foi enviado pelo celular.