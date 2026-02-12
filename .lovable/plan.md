
# Corrigir: Bot nao responde apos follow-ups

## Problema Identificado

Quando o sistema envia qualquer tipo de follow-up automatico e o lead responde, o bot ignora completamente a mensagem. Isso acontece porque o campo `bot_enabled` permanece `false` apos o envio dos follow-ups, e o webhook descarta mensagens recebidas quando `bot_enabled = false`.

Tres cenarios afetados:

1. **Follow-up #1 e #2** (apos "Analisar com calma"): O bot_enabled fica false e o bot_step fica em `complete_final`. O follow-up e enviado mas nao reativa o bot.
2. **Lembrete de proximo passo**: Embora defina `bot_enabled: true`, quando o lead demora para responder, o sistema ja desativou o bot no passo `complete_final`.
3. **Follow-up de bot inativo**: Quando nao ha pergunta do passo atual cadastrada, o sistema desativa o bot (`bot_enabled: false`) com step `bot_inactive_reminded`.

## Solucao

### 1. Follow-up #1 e #2 (`follow-up-check/index.ts`)

Apos enviar o follow-up, reativar o bot e definir o step como `proximo_passo` para que o bot processe a resposta do lead. Tambem incluir as opcoes numeradas no final da mensagem de follow-up para que o lead possa escolher uma opcao valida.

**Alteracoes:**
- Na funcao `processFollowUp`, apos enviar a mensagem e atualizar `last_message_at`, tambem atualizar: `bot_enabled: true` e `bot_step: 'proximo_passo'`
- Adicionar as opcoes numeradas ao final da mensagem de follow-up caso nao estejam presentes

### 2. Bot-inactive follow-up (`follow-up-check/index.ts`)

Garantir que o bot sempre permaneca ativo apos o envio do lembrete, independentemente de haver pergunta cadastrada ou nao.

**Alteracoes:**
- Na funcao `processBotInactiveFollowUp`, sempre definir `bot_enabled: true` no update da conversa (remover a condicao `hasReAskedQuestion`)
- Quando nao ha pergunta do passo no banco, usar a pergunta padrao do `DEFAULT_QUESTIONS` como fallback

### 3. Webhook - tratar resposta pos-follow-up (`wapi-webhook/index.ts`)

No `processBotQualification`, quando `bot_step` e `complete_final` e `bot_enabled` e `true` (reativado pelo follow-up), tratar a resposta do lead.

**Alteracoes:**
- Adicionar `complete_final` na verificacao de steps em `processBotQualification` para que, quando o lead responde apos um follow-up, o bot re-envie a pergunta de proximo passo com opcoes numeradas

---

## Detalhes Tecnicos

### Arquivo: `supabase/functions/follow-up-check/index.ts`

**processFollowUp** (linhas ~466-474): Apos o update de `last_message_at`, adicionar:
```typescript
bot_enabled: true,
bot_step: 'proximo_passo',
```

Tambem verificar se a mensagem de follow-up inclui opcoes numeradas. Se nao incluir, anexar:
```
*1* - Agendar visita
*2* - Tirar duvidas  
*3* - Analisar com calma
```

**processBotInactiveFollowUp** (linhas ~668-679): Alterar para sempre manter `bot_enabled: true`:
```typescript
bot_enabled: true, // sempre manter ativo
```

### Arquivo: `supabase/functions/wapi-webhook/index.ts`

Na funcao `processBotQualification` (linhas ~1328-1335), adicionar tratamento para `complete_final` com `bot_enabled: true`:
```typescript
} else if (conv.bot_step === 'complete_final') {
  // Lead respondeu apos follow-up - reenviar pergunta de proximo passo
  // processar como proximo_passo
}
```

## Resultado Esperado

- Lead responde ao follow-up #1 ou #2 -> bot processa a resposta como escolha de proximo passo (1=visita, 2=duvidas, 3=analisar)
- Lead responde ao lembrete de bot inativo -> bot continua o fluxo de qualificacao normalmente
- Se o lead enviar texto livre (nao numerico), o bot re-envia as opcoes validas
