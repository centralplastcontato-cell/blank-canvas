


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
