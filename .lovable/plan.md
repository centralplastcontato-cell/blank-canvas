

## Diagnóstico: Bot enviando mensagem duplicada no Castelo da Diversão

### Causa raiz

O provedor W-API está enviando o **mesmo webhook duas vezes** para a mesma mensagem recebida. Confirmei nos dados: a mensagem do lead (ID `ACF1C41D917C350B6133FEBB23CCD398`) foi salva duas vezes no banco, com timestamps de 21:39:26 e 21:39:28. Isso causou dois processamentos paralelos do bot, gerando duas mensagens de boas-vindas idênticas.

O problema tem **duas falhas** no código:

1. **Mensagens recebidas não têm dedup**: Para mensagens `fromMe=true`, o código verifica se o `message_id` já existe antes de inserir. Para mensagens recebidas (`fromMe=false`), **não há essa verificação** — insere diretamente.

2. **A reativação de lead LP quebra o atomic claim**: Quando o lead vem da Landing Page, o caminho de reativação (linha 2015) define `bot_step = 'welcome'` e depois cai no fluxo principal do bot. Como ambos webhooks fazem isso em paralelo, o mecanismo de "atomic claim" não funciona — ambos setam `welcome` e ambos conseguem reivindicá-lo.

### Plano de correção

**Arquivo**: `supabase/functions/wapi-webhook/index.ts`

#### 1. Adicionar dedup para mensagens recebidas
Na seção de inserção de mensagens (linha ~4183), adicionar a mesma verificação de `message_id` que já existe para mensagens `fromMe`:

```
if (!fromMe && msgId) {
  const { data: existingIncoming } = await supabase.from('wapi_messages')
    .select('id')
    .eq('conversation_id', conv.id)
    .eq('message_id', msgId)
    .limit(1)
    .maybeSingle();
  if (existingIncoming) {
    console.log(`[Webhook] Skipping duplicate incoming message ${msgId}`);
    break; // Skip bot processing entirely
  }
}
```

#### 2. Tornar a reativação LP atômica
Na reativação de leads LP (linha ~2015), usar um UPDATE condicional (como o atomic claim) em vez de um UPDATE simples, para garantir que apenas um webhook consiga reativar:

```
const { data: reactivated } = await supabase.from('wapi_conversations')
  .update({ bot_enabled: true, bot_step: 'welcome', lead_id: lpLead.id })
  .eq('id', conv.id)
  .in('bot_step', ['lp_sent', null])  // Only if not already reactivated
  .select('id')
  .maybeSingle();

if (!reactivated) {
  console.log(`[Bot] LP reactivation already claimed for conv ${conv.id}`);
  return;
}
```

#### 3. Deploy e validação
Fazer deploy da edge function e verificar nos logs que webhooks duplicados são ignorados.

### Resultado esperado
Mesmo que o W-API envie webhooks duplicados, apenas o primeiro será processado — o segundo será descartado tanto na inserção de mensagem quanto na ativação do bot.

