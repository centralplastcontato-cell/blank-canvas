

# Bloqueio total do bot em grupos do WhatsApp

## Problema

O bot enviou mensagens para grupos do WhatsApp porque nenhuma parte do sistema diferencia conversas individuais de conversas de grupo. Grupos no WhatsApp usam JIDs com sufixo `@g.us`, enquanto contatos individuais usam `@s.whatsapp.net`.

Atualmente existem **82 conversas de grupo** no banco com `bot_enabled = true`, e nenhuma das rotinas automatizadas filtra esse tipo de conversa.

## Solucao: Bloqueio permanente em 3 camadas

### 1. Webhook (prevencao na origem)

No `wapi-webhook/index.ts`, ao criar uma nova conversa (linha ~3126-3134), o sistema define `bot_enabled: true` sem verificar se e grupo. A correcao: se o `remote_jid` contem `@g.us`, forcar `bot_enabled = false` e `bot_step = null`.

Tambem adicionar uma verificacao antes de chamar `processBotQualification` (linha ~3212) para pular grupos.

### 2. Follow-up-check (prevencao nas rotinas automatizadas)

Adicionar filtro `.not('remote_jid', 'like', '%@g.us%')` em **todas** as 5 queries que buscam conversas:

| Rotina | O que faz |
|---|---|
| `processNextStepReminder` | Envia lembrete de proximo passo |
| `processFollowUp` (2x) | Envia follow-up 1 e 2 |
| `processBotInactiveFollowUp` | Envia lembrete quando lead nao responde |
| `processStaleRemindedAlerts` | Cria alerta de leads travados |
| `processStuckBotRecovery` | Reprocessa conversas travadas |

### 3. Limpeza do banco de dados

Desativar o bot em todas as 82 conversas de grupo existentes:

```text
UPDATE wapi_conversations 
SET bot_enabled = false, bot_step = NULL 
WHERE remote_jid LIKE '%@g.us%' AND bot_enabled = true;
```

## Detalhes tecnicos

### wapi-webhook/index.ts

Na criacao de nova conversa (linha ~3126):
- Antes do `insert`, verificar `const isGroup = rj.includes('@g.us');`
- Se grupo: `bot_enabled: false, bot_step: null`

Antes de chamar `processBotQualification` (linha ~3212):
- Adicionar `if (conv.remote_jid.includes('@g.us')) { skip }` 

### follow-up-check/index.ts

Adicionar `.not('remote_jid', 'like', '%@g.us%')` nas queries das linhas:
- ~196 (processNextStepReminder)
- ~654 (processBotInactiveFollowUp)
- ~1046 (processStaleRemindedAlerts)
- ~1280 (processStuckBotRecovery)
- Nas queries de processFollowUp (busca por leads com `Analisar`)

### Correcao adicional: WAPI_BASE_URL duplicado

Existe uma declaracao duplicada de `WAPI_BASE_URL` no follow-up-check (linhas ~826 e ~1699) que causa erro de compilacao. Remover a duplicata.

## Resultado esperado

Apos essas correcoes:
- Nenhuma rotina automatizada processara conversas de grupo
- Novas conversas de grupo serao criadas com bot desativado
- Grupos existentes serao limpos no banco
- O bot so interagira com contatos individuais (`@s.whatsapp.net`)

