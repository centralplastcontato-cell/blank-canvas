
Objetivo: impedir qualquer novo disparo automático em reconexão e eliminar o risco de rajada por sessão instável.

Diagnóstico confirmado (com evidência):
- O último follow-up gravado para Trujillo no banco foi às 14:06 UTC; a reconexão foi por volta de 18:47. Isso indica fila/backlog no provedor sendo entregue ao reconectar.
- `follow-up-check` envia mensagens direto para a W-API (`fetch https://api.w-api.app/...`) e ignora os bloqueios de sessão do `wapi-send` (preflight anti-envio em sessão ruim/desconectada).
- Hoje a instância Trujillo está com status inconsistente (DB “connected”, `get-status` retornando `unauthorized`), cenário perfeito para backlog e comportamentos inesperados.

Plano de implementação

1) Blindagem backend no motor de automação (arquivo principal)
- Arquivo: `supabase/functions/follow-up-check/index.ts`
- Criar helper único para envio automático via `wapi-send` (ações `send-text`, `send-image`, `send-video`, `send-document`) em vez de chamadas diretas para W-API.
- Antes de processar cada instância, fazer checagem “live” obrigatória (`wapi-send` `get-status`) e só continuar se `status=connected`.
- Adicionar “quarentena pós-reconexão” (ex.: 60–120 min após `connected_at`) para não disparar automações logo após reconectar.
- Em resposta bloqueada (`DISCONNECTED`, `SESSION_INCOMPLETE`, `UNAUTHORIZED`, `TIMEOUT_OR_GATEWAY`), interromper envio daquela instância no ciclo (circuit breaker) e não gravar `lead_history` de follow-up.

2) Guardrail de configuração para evitar falso “desativei tudo”
- Arquivo: `src/components/whatsapp/settings/AutomationsSection.tsx`
- Quando desligar o switch principal de follow-up, salvar em lote também:
  `follow_up_2_enabled=false`, `follow_up_3_enabled=false`, `follow_up_4_enabled=false`, `next_step_reminder_enabled=false`, `bot_inactive_followup_enabled=false`, `auto_lost_enabled=false`.
- Ajustar UX para deixar explícito “todos os disparos automáticos foram pausados para esta instância”.

3) Cobertura completa dos fluxos automáticos
- No mesmo `follow-up-check`, aplicar o helper seguro em todos os pontos de envio (follow-ups, next-step reminder, bot-inactive, recoveries), para não sobrar rota “direta” sem proteção.

4) Validação operacional (após patch)
- Rodar `follow-up-check` com Trujillo desconectada/unauthorized: esperado 0 envios + logs de “skipped/blocked”.
- Confirmar no banco: sem novos registros de `lead_history` com ações de follow-up para a instância Trujillo.
- Teste ponta a ponta: reconectar Trujillo e monitorar 5–10 min sem disparos automáticos.

Resultado esperado
- Sem novos envios automáticos enquanto a sessão não estiver realmente saudável.
- Sem rajada imediata pós-reconexão.
- Desligar “follow-up” passa a realmente pausar toda a régua automática da instância.
