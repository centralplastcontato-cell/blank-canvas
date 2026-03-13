
Resposta direta: com a configuração atual da unidade **Trujillo**, **não deve disparar mensagem automática** ao reconectar.

Validação que fiz agora:
- `wapi_bot_settings` da Trujillo está com:
  - `bot_enabled = false`
  - `follow_up_enabled = false`
  - `follow_up_2/3/4 = false`
  - `next_step_reminder_enabled = false`
  - `bot_inactive_followup_enabled = false`
  - `auto_lost_enabled = false`
- Nos logs mais recentes do `follow-up-check`, a Trujillo **não está sendo processada** (só outras instâncias).
- Critérios globais que ainda poderiam enviar (recovery/timer) para Trujillo estão com **0 candidatos agora**.

Conclusão operacional:
- Se você reconectar agora com esses toggles desligados, a tendência é **zero disparo automático**.
- Só haveria envio se alguém religar automações/bot ou fizer disparo manual.

Checklist rápido antes de conectar:
1) Confirmar na aba de automações da Trujillo que todos os toggles continuam OFF.
2) Conectar a instância.
3) Monitorar 2–3 minutos no chat/log; se aparecer qualquer envio automático, eu te passo bloqueio preventivo adicional imediato.
