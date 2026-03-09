

## Plano: Intervalo de segurança configurável entre envios de follow-up

### Problema
O `follow-up-check` envia mensagens para múltiplos leads em rajada, sem intervalo entre eles, arriscando bloqueio do WhatsApp.

### Solução
Adicionar dois campos configuráveis (`follow_up_send_min_delay` e `follow_up_send_max_delay`) na tabela `wapi_bot_settings` e na UI de Automações, com defaults seguros (8s e 15s). A edge function usará esses valores para inserir um delay aleatório entre envios.

### Alterações

**1. Migration — nova coluna na `wapi_bot_settings`**
```sql
ALTER TABLE wapi_bot_settings
  ADD COLUMN follow_up_send_min_delay integer NOT NULL DEFAULT 8,
  ADD COLUMN follow_up_send_max_delay integer NOT NULL DEFAULT 15;
```

**2. `supabase/functions/follow-up-check/index.ts`**
- Adicionar helper `randomSafeDelay(minSec, maxSec)` que retorna uma Promise com setTimeout aleatório.
- Ler os novos campos do `wapi_bot_settings` (já vêm na query existente de settings).
- Adicionar `FollowUpSettings` com `follow_up_send_min_delay` e `follow_up_send_max_delay`.
- Nos 4 loops de envio (`processFollowUp`, `processNextStepReminder`, `processBotInactiveFollowUp`, `processStuckBotRecovery`), após cada envio bem-sucedido (exceto o último), chamar `await randomSafeDelay(min, max)`.

**3. `src/components/whatsapp/settings/AutomationsSection.tsx`**
- Adicionar seção "Intervalo de segurança entre envios" com dois inputs (Mín e Máx, em segundos), range 5-30s, similar ao padrão já usado no `SendBotDialog`.
- Posicionar na área de Follow-ups, abaixo das configurações de horário.

### Detalhes técnicos

Os defaults (8-15s) são seguros e já validados pelo padrão do `SendBotDialog`. Com 20 leads, o ciclo levaria ~3-5 minutos, dentro do timeout da edge function.

A UI terá validação: mín entre 5-30, máx entre mín-30, com clamp no `onBlur`.

### Arquivos alterados
| Arquivo | Tipo |
|---|---|
| Migration SQL | DB |
| `supabase/functions/follow-up-check/index.ts` | Edge Function |
| `src/components/whatsapp/settings/AutomationsSection.tsx` | Frontend |

