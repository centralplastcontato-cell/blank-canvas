
# Corrigir lentidao do bot - Planeta Divertido

## Problema identificado

O bot demora ~4 minutos para responder porque a mensagem nao esta sendo processada pelo webhook principal. O que acontece:

1. Mensagem chega no `wapi-webhook`
2. O numero piloto (`15981121710`) e detectado e forcado para o **Flow Builder** (sandbox bypass na linha 1806)
3. O Flow Builder busca um `conversation_flows` para a empresa Planeta Divertido
4. **Nao existe nenhum fluxo cadastrado** para essa empresa - processamento para silenciosamente
5. O `follow-up-check` detecta a conversa "presa" 2-4 minutos depois e envia a resposta pelo **recovery**

Alem disso, o `bot_enabled` voltou a `false` e o `use_flow_builder` esta `false`, confirmando que essa instancia usa o fluxo de qualificacao **legado** (nao Flow Builder).

## Solucao

### 1. Remover o PILOT_PHONE sandbox do webhook

O bypass do numero piloto foi criado para testes internos de outra empresa, mas esta interferindo no funcionamento de todas as instancias. A solucao e condicionar o bypass apenas quando a empresa realmente tem um fluxo V2 configurado. Se nao tiver, deixar seguir o fluxo normal.

**Arquivo**: `supabase/functions/wapi-webhook/index.ts`

- Na funcao `processBotQualification` (linha ~1802): em vez de forcar o Flow Builder incondicionalmente para o PILOT_PHONE, verificar primeiro se existe um fluxo para a empresa. Se nao existir, continuar o processamento normal (bot legado).
- Alterar de:
  ```
  if (isPilotPhone) {
    processFlowBuilderMessage(...);
    return;  // <-- para aqui mesmo sem fluxo
  }
  ```
  Para:
  ```
  if (isPilotPhone) {
    // Verificar se existe fluxo antes de forcar
    const hasFlow = await checkCompanyHasFlow(supabase, instance.company_id);
    if (hasFlow) {
      processFlowBuilderMessage(...);
      return;
    }
    // Se nao tem fluxo, continuar no bot legado
  }
  ```

### 2. Corrigir bot_enabled via migracao

Atualizar `wapi_bot_settings` para manter `bot_enabled = true` para a instancia da Planeta Divertido, evitando que o bot pare de funcionar.

### 3. Resetar conversa de teste

Resetar a conversa para o passo `welcome` com `bot_data` limpo para testar do zero.

## Resultado esperado

- Mensagem "Ola" processada instantaneamente pelo webhook (< 2 segundos)
- Sem depender do recovery do follow-up-check
- Resposta com "Planeta Divertido" substituido corretamente
