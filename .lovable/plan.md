
Objetivo: investigar por que a mensagem aparece na plataforma, mas no WhatsApp fica como “Aguardando mensagem”.

Diagnóstico que encontrei (com evidências)

1) O bot está processando e tentando enviar normalmente
- Logs do `wapi-webhook` mostram envio real:
  - `[Bot] Sending message to 5515981121710 via instance LITE-4IW93E-MGVYDW`
  - `[Bot] send-text response: msgId=CSOVIF3H7VRGU1OO1Y9X0W, attempt=phone+message`
- No banco, a mensagem foi persistida em `wapi_messages` com `from_me=true` e `status='sent'` para a conversa do número `5515981121710`.

2) O problema não está no match do número de teste
- O número `15981121710` está sendo reconhecido no sandbox em logs recentes.
- A normalização de telefone com/sem 9º dígito está ativa no código (`isSameTestPhone`).

3) Há inconsistência de configuração ativa do bot no banco
- Em `wapi_bot_settings` da instância `LITE-4IW93E-MGVYDW`:
  - `bot_enabled = false`
  - `test_mode_enabled = true`
  - `test_mode_number = 15981121710`
- Isso contradiz “desativei teste e ativei global”, indicando possível falha de persistência no salvamento da tela de automações (ou alteração não salva/aplicada).

4) A instância problemática está com sinais de instabilidade do provedor
- `wapi-send get-status` para `LITE-4IW93E-MGVYDW` retornou:
  - `status: degraded`
  - `errorType: TIMEOUT_OR_GATEWAY`
- Logs mostram:
  - timeouts/abort (`The signal has been aborted`)
  - mistura de `404` + timeout nos endpoints de status
- Para a instância boa (`LITE-I2660D-A8QLPN`), o mesmo número recebeu mensagens com status `delivered/read` no banco.

5) O sintoma “Aguardando mensagem” no WhatsApp é típico de camada de entrega/criptografia
- Esse aviso aparece quando o WhatsApp não consegue decodificar/baixar a mensagem naquele momento (problema de sessão/chave/estado da conexão do lado WhatsApp/provedor), não por erro de renderização do nosso chat.

Do I know what the issue is?
Sim. O problema principal está no estado da instância/provedor (degradação de comunicação e/ou sessão inconsistente), com um problema secundário de configuração não refletida no banco (`test_mode_enabled` ainda true, `bot_enabled` false). Não há evidência de falha no matching do número de teste neste momento.

Plano de correção (implementação proposta)

Fase 1 — Evitar “falso conectado/falso enviado” (backend resiliente)
1. Ajustar `wapi-send` (`get-status`) para NÃO considerar “connected” apenas por fallback de QR com resposta parcial.
2. Exigir sinais mínimos de sessão válida para “connected” (ex.: `me.id`/`wid.user`/state confiável), senão retornar `degraded`.
3. Em `sendTextWithFallback` e `sendTextViaWapiWithFallback`, validar payload de sucesso de forma mais rígida:
   - status HTTP + ausência de erro + presença de identificadores consistentes.
4. Se instância estiver `degraded`, retornar erro explícito para UI (não marcar como enviado normal).

Fase 2 — Observabilidade para fechar causa raiz com precisão
5. Logar (sanitizado) o corpo de resposta da W-API por tentativa quando envio falhar ou vier sem confirmação robusta.
6. Logar mapeamento de status webhook por `messageId` para detectar divergência entre ID de envio e ID de delivery.

Fase 3 — Consistência de configuração do bot
7. Auditar fluxo de salvamento de `AutomationsSection` para garantir persistência real de:
   - `test_mode_enabled`
   - `test_mode_number`
   - `bot_enabled`
8. Adicionar feedback visual de “salvo no banco” com leitura de volta (read-after-write) para evitar “liguei/desliguei mas não aplicou”.

Fase 4 — Playbook de recuperação da instância Aventura
9. Criar rotina guiada de recuperação (sem apagar histórico):
   - revalidar webhook,
   - forçar refresh de status,
   - se continuar `degraded`, ciclo controlado de desconectar/reconectar.
10. Enquanto `degraded`, exibir alerta no painel para impedir diagnóstico confuso (“mensagem aparece no sistema, mas não entrega”).

Validação após implementação
- Teste 1: enviar para `15981121710` com instância Aventura e confirmar evolução de status (`sent -> delivered/read`) no banco.
- Teste 2: comparar com envio direto no painel W-API (que você ainda não testou) para separar problema de plataforma vs sessão do provedor.
- Teste 3: confirmar que alternar “modo teste/global” altera de fato os campos no banco imediatamente.

Arquivos alvo previstos
- `supabase/functions/wapi-send/index.ts` (status e validação de envio)
- `supabase/functions/wapi-webhook/index.ts` (validação e logs de envio/status)
- `src/components/whatsapp/settings/AutomationsSection.tsx` (persistência e confirmação visual de config)

Risco e impacto
- Baixo risco estrutural (sem mudanças de schema).
- Alto ganho de confiabilidade operacional: reduz falsos positivos de envio e acelera diagnóstico quando o provedor degrada.
