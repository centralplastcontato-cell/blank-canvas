
# Corrigir: follow-up-check ignora o Modo de Teste

## Problema identificado

O guard de "Modo de Teste" existe corretamente no **wapi-webhook** (linha 1709-1718) -- quando o bot recebe uma mensagem, ele verifica se o modo de teste esta ativo e bloqueia qualquer numero que nao seja o numero de teste.

Porem, a edge function **follow-up-check** (que roda periodicamente e envia mensagens automaticas como follow-ups, lembretes de inatividade, next-step reminders e recuperacao de bot travado) **NAO verifica o modo de teste**. Isso significa que:

- Follow-ups automaticos sao enviados para TODOS os leads, mesmo com modo de teste ativo
- Lembretes de "proximo passo" sao enviados para qualquer conversa parada
- Recuperacao de bot travado envia mensagens para contatos reais
- Lembretes de inatividade do bot sao enviados sem filtro

## Solucao

Adicionar verificacao de `test_mode_enabled` e `test_mode_number` na funcao `follow-up-check`. Quando o modo de teste estiver ativo para uma instancia, todas as mensagens automaticas dessa instancia devem ser enviadas **somente** para o numero de teste configurado.

### Alteracoes no arquivo `supabase/functions/follow-up-check/index.ts`

**1. Buscar campos de test_mode junto com os settings (linha ~69)**

Adicionar `test_mode_enabled` e `test_mode_number` na query de `wapi_bot_settings`:

```text
.select("instance_id, test_mode_enabled, test_mode_number, follow_up_enabled, ...")
```

**2. Filtrar conversas nas 4 funcoes per-instance**

Em cada funcao que envia mensagens (`processNextStepReminder`, `processFollowUp`, `processBotInactiveFollowUp`), adicionar um guard no loop de conversas:

```text
// Se modo de teste ativo, so envia para o numero de teste
if (settings.test_mode_enabled && settings.test_mode_number) {
  const testNum = settings.test_mode_number.replace(/\D/g, '');
  const convPhone = conv.remote_jid.replace('@s.whatsapp.net','').replace('@c.us','');
  if (!convPhone.includes(testNum.replace(/^55/, ''))) {
    continue; // Pula este contato
  }
}
```

**3. Filtrar nas funcoes globais**

As funcoes `processStuckBotRecovery` e `processStaleRemindedAlerts` rodam de forma global (nao por instancia). Para essas, buscar os bot_settings da instancia de cada conversa e aplicar o mesmo filtro.

### Resumo das funcoes afetadas

| Funcao | Tipo | Acao |
|--------|------|------|
| `processNextStepReminder` | Per-instance | Adicionar guard no loop |
| `processFollowUp` | Per-instance | Adicionar guard no loop |
| `processBotInactiveFollowUp` | Per-instance | Adicionar guard no loop |
| `processStuckBotRecovery` | Global | Buscar settings e aplicar guard |
| `processStaleRemindedAlerts` | Global | Buscar settings e aplicar guard |
| `processFlowTimerTimeouts` | Global | Buscar settings e aplicar guard |

### Interface atualizada

```text
interface FollowUpSettings {
  // ... campos existentes ...
  test_mode_enabled?: boolean;
  test_mode_number?: string | null;
}
```

## Resultado esperado

Com modo de teste ativo e numero `15974000152` configurado:
- Mensagens automaticas so serao enviadas para `15974000152`
- Todos os demais contatos serao ignorados pelas automacoes
- Logs indicarao claramente quando uma mensagem for bloqueada pelo modo de teste
