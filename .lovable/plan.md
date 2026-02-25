

## Corrigir bot do Planeta Divertido que não inicia

### Problema diagnosticado
O bot não responde mensagens do número de teste porque:

1. **Tabela `wapi_bot_settings` vazia** para a instancia do Planeta Divertido (ID: `ac422826-d1a9-40a6-8ce2-acc5a0c1cb64`). O webhook faz `if (!settings) return;` na linha 1803 e abandona o processamento.
2. O **SANDBOX hardcoded** para o numero piloto (`15981121710`) fica nas linhas 1806-1813, **depois** desse return, entao nunca e alcancado.
3. **Nao existe nenhum `conversation_flow`** cadastrado para a empresa, impossibilitando o uso do Flow Builder.

### Solucao

**1. Criar registro de `wapi_bot_settings` (migration SQL)**

Inserir configuracoes iniciais para a instancia do Planeta Divertido, habilitando o modo de teste com o numero do usuario:

```sql
INSERT INTO wapi_bot_settings (instance_id, company_id, bot_enabled, test_mode_enabled, test_mode_number, message_delay)
VALUES (
  'ac422826-d1a9-40a6-8ce2-acc5a0c1cb64',
  '6bc204ae-1311-4c67-bb6b-9ab55dae9d11',
  true,
  true,
  '5515981121710',
  3
);
```

Isso garante que:
- O bot esta habilitado (`bot_enabled: true`)
- Modo de teste ativo para proteger clientes reais (`test_mode_enabled: true`)
- Apenas o numero de teste recebe as mensagens do bot

**2. (Opcional) Mover o SANDBOX antes do check de settings no `wapi-webhook`**

Reordenar as linhas 1802-1814 no `wapi-webhook/index.ts` para que a verificacao do numero piloto aconteca **antes** do `if (!settings) return;`. Isso evita que o SANDBOX dependa de ter um registro em `wapi_bot_settings`.

Mudanca no codigo:
- Mover o bloco SANDBOX (linhas 1806-1813) para **antes** da linha 1802 (`const settings = await getBotSettings(...)`)
- Assim o numero piloto sempre sera processado, independente da existencia de bot_settings

**3. Resetar a conversa para re-testar**

Apos aplicar, sera necessario resetar o `bot_step` da conversa do Vitor para que o bot reinicie:

```sql
UPDATE wapi_conversations 
SET bot_step = NULL, bot_data = '{}', bot_enabled = true 
WHERE id = '9e13379a-34eb-4cdd-859b-b36576e2afd2';
```

### Arquivos afetados
- Nova migration SQL (inserir `wapi_bot_settings`)
- `supabase/functions/wapi-webhook/index.ts` (reordenar bloco SANDBOX - opcional)

### Resultado esperado
Ao enviar "Ola" do numero de teste, o bot respondera com a mensagem de boas-vindas e iniciara o fluxo de qualificacao (Nome, Tipo, Mes, Dia, Convidados) utilizando as perguntas ja cadastradas em `wapi_bot_questions`.

