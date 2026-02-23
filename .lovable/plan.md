
# Corrigir Modo de Teste do Bot sendo ignorado no Flow Builder

## Problema encontrado

O bug esta no arquivo `supabase/functions/wapi-webhook/index.ts`, na funcao `processBotQualification`.

Quando o Flow Builder esta ativado (`use_flow_builder = true`), o codigo na **linha 1689** delega imediatamente para `processFlowBuilderMessage` **ANTES** de verificar o Modo de Teste (linhas 1695-1700). Isso significa que a verificacao de `test_mode_enabled` e `test_mode_number` e completamente ignorada, e o bot dispara mensagens para TODOS os contatos.

```text
Fluxo atual (com bug):

  processBotQualification()
    |
    +-- Piloto? --> Flow Builder V2
    |
    +-- use_flow_builder? --> processFlowBuilderMessage()  <-- PULA O CHECK DE TEST MODE!
    |
    +-- Verificar test_mode_enabled / test_mode_number  <-- So chega aqui se use_flow_builder=false
```

## Solucao

Mover a verificacao de Modo de Teste para **antes** da delegacao ao Flow Builder. Assim, quando `test_mode_enabled=true`, o bot so responde ao numero de teste, independentemente de ser Flow Builder ou bot original.

```text
Fluxo corrigido:

  processBotQualification()
    |
    +-- Piloto? --> Flow Builder V2
    |
    +-- Verificar test_mode_enabled / test_mode_number  <-- AGORA VERIFICA PRIMEIRO
    |   (se test_mode ativo e nao e o numero de teste --> return)
    |
    +-- use_flow_builder? --> processFlowBuilderMessage()
    |
    +-- Bot original (perguntas sequenciais)
```

## Alteracao tecnica

**Arquivo: `supabase/functions/wapi-webhook/index.ts`**

Reorganizar o codigo entre as linhas ~1688-1700:

1. Mover as linhas de verificacao de test mode (1695-1700) para ANTES do bloco `if (settings.use_flow_builder)`
2. Adicionar um guard: se `test_mode_enabled` esta ativo e o numero NAO e o numero de teste, retornar imediatamente (nao processar)
3. Tambem verificar: se `bot_enabled` esta desligado E `test_mode_enabled` tambem esta desligado, retornar (nenhum bot ativo)

O codigo ficara assim:

```typescript
// ── Test mode guard (applies to ALL bot modes including Flow Builder) ──
const n = normalizePhone(contactPhone);
const tn = settings.test_mode_number ? normalizePhone(settings.test_mode_number) : null;
const isTest = tn && n.includes(tn.replace(/^55/, ''));

// If test mode is on, only allow the test number through
if (settings.test_mode_enabled && !isTest) {
  console.log(`[Bot] Test mode ON — phone ${contactPhone} is NOT test number, skipping`);
  return;
}

// If neither bot_enabled nor test_mode_enabled, no bot should run
if (!settings.bot_enabled && !settings.test_mode_enabled) {
  // Still allow LP leads to be processed below
  // (the existing LP logic handles this)
}

// Check if Flow Builder mode is enabled — delegate to flow processor
if (settings.use_flow_builder) {
  console.log(`[Bot] Flow Builder mode enabled for instance ${instance.id}, delegating...`);
  await processFlowBuilderMessage(supabase, instance, conv, content, contactPhone, contactName);
  return;
}
```

## Arquivo a editar

| Arquivo | Alteracao |
|---|---|
| `supabase/functions/wapi-webhook/index.ts` | Mover verificacao de test_mode para antes do bloco use_flow_builder (linhas ~1688-1700) |

## Resultado esperado

- Com "Modo de Teste" ativado e numero `15974000152` configurado, o bot so respondera a esse numero
- Todos os outros contatos nao receberao mensagens automaticas do bot
- Funciona tanto para o bot original quanto para o Flow Builder
