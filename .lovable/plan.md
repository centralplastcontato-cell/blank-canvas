
# Protecao contra bot travado (stuck bot recovery)

## Problema

Quando o edge function `wapi-webhook` sofre um `Shutdown` (timeout) enquanto processa a resposta de um lead, a mensagem e salva no banco (`wapi_messages`), mas a funcao `processBotQualification` nao executa. Isso deixa a conversa "travada": o lead respondeu, mas o bot nunca avancou para o proximo passo.

O caso da Daniella Harumi na unidade Trujillo e exatamente este cenario -- ela respondeu "1" no passo `convidados`, a mensagem foi salva, mas o bot_step nunca foi atualizado.

## Solucao

Adicionar uma nova verificacao no `follow-up-check` que detecta conversas onde:
- `bot_enabled = true`
- `last_message_from_me = false` (o lead respondeu)
- `bot_step` esta em um passo ativo do bot (nome, tipo, mes, dia, convidados)
- `last_message_at` tem mais de 2 minutos (tempo suficiente para confirmar que nao e processamento normal)

Quando detectada, a funcao busca a ultima mensagem do lead nessa conversa e chama o endpoint `wapi-webhook` para reprocessar, ou diretamente reprocessa a logica de validacao do bot inline.

## Abordagem escolhida: Reprocessamento direto no follow-up-check

Em vez de chamar o webhook novamente (o que adicionaria complexidade), o follow-up-check vai:

1. Buscar a ultima mensagem do lead (`from_me = false`) na conversa
2. Validar a resposta usando a mesma logica de `validateAnswer`
3. Atualizar `bot_data` e `bot_step` no banco
4. Enviar a proxima pergunta do bot via W-API
5. Registrar no log que foi um "recovery" automatico

## Arquivos a editar

| Arquivo | Alteracao |
|---|---|
| `supabase/functions/follow-up-check/index.ts` | Adicionar funcao `processStuckBotRecovery` que detecta e reprocessa conversas travadas |

## Detalhes tecnicos

### Nova funcao: processStuckBotRecovery

```typescript
async function processStuckBotRecovery({ supabase }): Promise<{ successCount, errors }> {
  // 1. Buscar conversas onde:
  //    - bot_enabled = true
  //    - last_message_from_me = false (lead respondeu)
  //    - bot_step IN (nome, tipo, mes, dia, convidados, welcome)
  //    - last_message_at < now() - 2 minutes
  //    - last_message_at > now() - 30 minutes (janela razoavel)
  
  // 2. Para cada conversa travada:
  //    a. Buscar ultima mensagem from_me=false da wapi_messages
  //    b. Buscar bot_questions da instancia
  //    c. Validar a resposta com validateAnswer()
  //    d. Se valida: atualizar bot_data + bot_step + enviar proxima pergunta
  //    e. Se invalida: re-enviar pergunta atual com erro
  //    f. Log: "[follow-up-check] Recovered stuck bot for conv {id}"
}
```

### Integracao no handler principal

Chamar `processStuckBotRecovery` no inicio do loop (antes dos follow-ups por instancia), pois e uma verificacao global que nao depende de settings de follow-up.

### Funcoes de validacao

Copiar as funcoes `validateAnswer`, `validateName`, `validateMenuChoice`, `validateMonth`, `validateDay`, `validateGuests` do `wapi-webhook` para o `follow-up-check`, ou extrair para um modulo compartilhado. Como edge functions nao suportam imports entre funcoes, sera necessario copiar as funcoes relevantes.

### Seguranca

- Janela maxima de 30 minutos para evitar reprocessar mensagens antigas
- Minimo de 2 minutos para nao interferir com processamento normal
- Marcar conversa com flag temporaria apos recovery para evitar loops
