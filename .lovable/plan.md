

## ✅ Implementado: Fallback de atividade para status de instâncias W-API

### Problema resolvido
Instância Manchester (LITE-I2660D-A8QLPN) era marcada como `disconnected` porque o endpoint `/instance/qr-code` da W-API LITE retornava QR code indevidamente, mesmo com a sessão funcional (mensagens entrando/saindo via webhook).

### Alterações realizadas

**1. `supabase/functions/wapi-send/index.ts` — action `get-status`**
- Quando QR code é detectado, antes de concluir `disconnected`, verifica `wapi_conversations.last_message_at` nos últimos 30 min
- Se houver atividade recente + `phone_number` preenchido → retorna `connected` com flag `evidenceBased: true`
- Sem atividade → comportamento original mantido (`disconnected`)

**2. `supabase/functions/follow-up-check/index.ts` — `checkInstanceHealth()`**
- Se `get-status` retorna `disconnected` ou `degraded`, verifica atividade recente em `wapi_conversations` antes de bloquear automações
- Se houver atividade nos últimos 30 min → trata como saudável (não bloqueia automações)
- Mesmo fallback aplicado quando o health check falha completamente

**3. `src/components/whatsapp/settings/ConnectionSection.tsx` — UI**
- Toast mostra "Conectado ✅ (verificado por atividade)" quando o status é evidence-based

### Garantias de segurança
- Instâncias realmente desconectadas (sem atividade recente) continuam sendo bloqueadas
- Quarentena pós-reconexão de 60 min não foi alterada
- Nenhuma mudança em lógica de conexão, webhooks, envio ou credenciais
- Outros buffets não são afetados — a mudança é uma camada adicional de validação

## ✅ Implementado: Blindagem anti-rajada no follow-up-check

### Alterações realizadas

**1. `supabase/functions/follow-up-check/index.ts`**
- Adicionada função `checkInstanceHealth()` com cache por ciclo de execução
- **Quarentena pós-reconexão**: 60 minutos após `connected_at` antes de permitir qualquer automação
- **Pre-flight live check**: verifica status real via `wapi-send get-status` antes de processar cada instância
- **Circuit breaker**: se instância não está saudável, TODAS as automações são bloqueadas (follow-ups, next-step reminder, bot-inactive, auto-lost)
- **Cobertura global**: health gate aplicado também em `processFlowTimerTimeouts` e `processStuckBotRecovery` (funções que rodam cross-instance)

**2. `src/components/whatsapp/settings/AutomationsSection.tsx`**
- **Guardrail no switch principal**: desligar "Primeiro Follow-up" agora desativa em lote: FU2, FU3, FU4, next_step_reminder, bot_inactive_followup e auto_lost
- Toast explícito: "Todas as automações pausadas"

### Resultado
- Reconectar uma instância NÃO dispara automações por 60 minutos
- Instâncias com sessão ruim (unauthorized, disconnected) são bloqueadas automaticamente
- Desligar follow-up principal realmente pausa toda a régua
