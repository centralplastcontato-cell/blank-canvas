

## Plano: Horário limite para envio de Follow-ups

### Problema
Os follow-ups automáticos podem ser enviados a qualquer hora, inclusive de madrugada, o que é inconveniente para os clientes.

### Solução
Adicionar um campo configurável `follow_up_max_hour` (padrão: 22) na tabela `wapi_bot_settings` e respeitar esse limite na Edge Function `follow-up-check`. Se estiver fora do horário permitido, o envio é adiado para o próximo dia útil dentro do horário.

### Etapas

**1. Migração de banco de dados**
- Adicionar coluna `follow_up_max_hour` (integer, default 22) e `follow_up_min_hour` (integer, default 8) na tabela `wapi_bot_settings`.
- Isso permite definir uma janela de envio (ex: 8h às 22h).

**2. UI — Configurações > Automações > Follow-ups**
- No card "Follow-up Automático" do `AutomationsSection.tsx`, adicionar um bloco no topo com dois campos numéricos:
  - "Horário mínimo para envio" (padrão 8h)
  - "Horário máximo para envio" (padrão 22h)
- Usar o mesmo padrão de Input + onBlur + `updateBotSettings` já existente.
- Exibir uma nota explicativa: "Follow-ups fora deste horário serão adiados para o próximo período permitido."

**3. Edge Function `follow-up-check`**
- No select de `allSettings`, incluir `follow_up_max_hour` e `follow_up_min_hour`.
- Antes de enviar cada follow-up (nas funções `processFollowUp`, `processBotInactiveFollowUp`, `processNextStepReminder`), verificar a hora atual (timezone America/Sao_Paulo):
  - Se hora atual < `min_hour` ou hora atual >= `max_hour`, pular o envio (o cron rodará novamente no próximo ciclo e enviará quando estiver no horário).
- Isso é simples e seguro: não altera a lógica de elegibilidade, apenas adia o disparo.

**4. Atualizar interface `BotSettings` e `FollowUpSettings`**
- Adicionar os campos `follow_up_max_hour` e `follow_up_min_hour` nas interfaces TypeScript do frontend (`AutomationsSection.tsx`) e da Edge Function.

### Arquivos impactados
- `supabase/migrations/` — nova migração (ALTER TABLE)
- `src/components/whatsapp/settings/AutomationsSection.tsx` — UI dos campos
- `supabase/functions/follow-up-check/index.ts` — lógica de horário

