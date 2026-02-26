

## Problema: Bot enviando mensagem duplicada quando cliente manda mais de uma mensagem rápida

### O que está acontecendo

Quando um cliente envia 2 mensagens rapidamente (ex: "Boa tarde" + "Boa tarde"), o webhook do WhatsApp recebe cada mensagem como uma chamada independente. As duas chamadas leem o estado `bot_step: 'welcome'` ao **mesmo tempo**, antes que qualquer uma delas atualize o banco. Resultado: as duas processam o step `welcome` e enviam a mensagem de boas-vindas duas vezes.

Isso é uma **condição de corrida** (race condition) clássica.

### Solução

Adicionar uma **trava de deduplicação** no início da função `processBotQualification` que impede o processamento simultâneo do mesmo step para a mesma conversa.

### Alterações

**Arquivo:** `supabase/functions/wapi-webhook/index.ts`

1. **Trava atômica no banco (UPDATE condicional):** No início de `processBotQualification`, antes de processar qualquer step, fazer um `UPDATE ... SET bot_data = { ...bot_data, _processing: true }` com condição `WHERE bot_data->>'_processing' IS NULL` (ou similar). Se o UPDATE retorna 0 linhas afetadas, significa que outra chamada já está processando - nesse caso, ignorar silenciosamente.

2. **Abordagem mais simples e robusta:** Usar o `bot_step` como a própria trava. Antes de enviar a mensagem de boas-vindas, avançar o `bot_step` para o próximo passo **primeiro** (de forma atômica com WHERE `bot_step = 'welcome'`). Se o UPDATE retorna 0 linhas, outra chamada já avançou o step -- abortar sem enviar nada.

```text
Fluxo atual (com bug):
  Msg1 -> lê bot_step='welcome' -> envia boas-vindas -> atualiza step
  Msg2 -> lê bot_step='welcome' -> envia boas-vindas -> atualiza step (duplicado!)

Fluxo corrigido:
  Msg1 -> UPDATE bot_step='nome' WHERE bot_step='welcome' (1 row) -> envia boas-vindas
  Msg2 -> UPDATE bot_step='nome' WHERE bot_step='welcome' (0 rows) -> SKIP (nao envia nada)
```

3. **Aplicar para TODOS os steps, nao so welcome:** A mesma lógica de "claim atômico" será aplicada para todos os steps do bot. Antes de processar qualquer resposta, o webhook faz um UPDATE condicional com WHERE `bot_step = <step_atual>`. Se outra chamada já avançou o step, a mensagem é ignorada pelo bot (mas continua sendo salva normalmente no histórico).

4. **Limpar flag de processamento:** Ao final do processamento (envio da mensagem + update do step), o bot já terá atualizado o `bot_step` para o próximo, então não há flag residual.

### Detalhes Técnicos

No início da função `processBotQualification`, logo antes de processar o step:

```text
// Atomic claim: try to "lock" this step for processing
const currentStep = conv.bot_step || 'welcome';
const { data: claimed } = await supabase
  .from('wapi_conversations')
  .update({ bot_data: { ...botData, _processing_step: currentStep } })
  .eq('id', conv.id)
  .eq('bot_step', currentStep)
  .select('id')
  .single();

if (!claimed) {
  // Another webhook call already advanced this step - skip
  console.log(`[Bot] Step "${currentStep}" already claimed for conv ${conv.id}, skipping duplicate`);
  return;
}
```

Isso resolve o problema para:
- Mensagens de boas-vindas duplicadas
- Qualquer step do bot que receba mensagens simultâneas
- Funciona globalmente para todas as empresas da plataforma

