
Objetivo imediato
- Eliminar o falso cenário de “enviado na plataforma” quando a sessão da instância está incompleta no provedor, e impedir novos envios enquanto o WhatsApp estiver no estado que gera “Aguardando mensagem”.

Diagnóstico confirmado agora (com evidências recentes)
1) A instância problemática continua em sessão incompleta após reconexão
- `wapi-send get-status` segue retornando `degraded` + `SESSION_INCOMPLETE`.
- Logs mostram repetidamente: “QR says connected but NO phone number”.
- No banco, a instância `LITE-4IW93E-MGVYDW` está `status=connected`, porém `phone_number = null`.

2) O envio continua ocorrendo mesmo nesse estado degradado
- `send-text` retorna `messageId` (ex.: `KPGJ...`, `GOJN...`) e a UI trata como sucesso.
- Esses IDs permanecem em `wapi_messages.status = 'sent'`, sem evolução para `delivered/read`.

3) Há eventos webhook não roteados que podem conter sinal útil de estado
- Logs recorrentes: `Unhandled event: undefined` com body keys `[instanceId, connectedPhone, connectedLid, chat, status, moment]`.
- Hoje esses eventos são descartados (“Unroutable”), reduzindo nossa observabilidade.

4) Há inconsistência de estado operacional
- A camada de status detecta sessão incompleta, mas a camada de envio não bloqueia.
- Resultado: usuário continua vendo “enviado” no sistema, e no WhatsApp fica “Aguardando mensagem”.

Plano de implementação (próxima execução aprovada)

Fase 1 — Bloqueio de envio em sessão incompleta (prioridade máxima)
1. Adicionar preflight obrigatório no `wapi-send` para ações de envio (`send-text`, `send-image`, `send-audio`, `send-video`, `send-document`, etc.):
   - Antes de enviar, validar “saúde da sessão” da instância.
   - Se `SESSION_INCOMPLETE` ou `degraded/TIMEOUT_OR_GATEWAY`, retornar erro explícito para frontend (sem “success: true”).

2. Fortalecer regra de “conectado válido”:
   - Considerar conectado somente com sinal mínimo forte (ex.: `phoneNumber`/`me.id` presente).
   - Se conectado sem telefone, tratar como `SESSION_INCOMPLETE` em todo caminho, não só no endpoint de status.

3. Evitar gravação enganosa como `sent` quando envio não está saudável:
   - Se preflight falhar, persistir mensagem como `failed` com motivo técnico (ex.: `SESSION_INCOMPLETE`) em vez de `sent`.

Fase 2 — Correção de estado falso de conexão no webhook
4. Ajustar `wapi-webhook` no handler de conexão:
   - Não gravar `wapi_instances.status='connected'` quando `connectedPhone` estiver ausente.
   - Nessa condição, marcar `status='degraded'` (ou manter anterior + flag) e salvar motivo de sessão incompleta.
   - Isso evita a tela exibir “Online” quando a sessão não está pronta para entrega real.

5. Tratar eventos “sem event” com shape de status:
   - Roteamento adicional para payloads com `{ chat, status, moment }` mesmo sem `messageId`.
   - Ao menos registrar telemetria estruturada por instância/conversa para diagnóstico.

Fase 3 — UX/Produto para evitar nova frustração
6. `WhatsAppChat`:
   - Quando backend retornar `SESSION_INCOMPLETE`, mostrar toast claro (“Instância conectada sem sessão válida. Reconecte por código de pareamento/telefone.”).
   - Não deixar a bolha otimista finalizar como “sent”; manter como erro com opção “tentar novamente”.

7. `ConnectionSection`:
   - Unificar tratamento de `SESSION_INCOMPLETE` em todos os fluxos (refresh individual e sync geral), não apenas timeout.
   - Exibir estado visual explícito (ex.: “Sessão incompleta”) no card da instância.

Fase 4 — Observabilidade e validação final
8. Log estruturado por tentativa de envio:
   - `instance_id`, `attempt`, `messageId`, `sessionHealth`, `blockedReason`.
9. Log de transição de status por mensagem:
   - Quando `message_id` ficar preso em `sent` por janela definida, registrar alerta operacional.
10. Validação end-to-end pós-implementação:
   - Enviar teste para `15981121710` com instância Aventura.
   - Critério de sucesso: evolução para `delivered/read` ou bloqueio explícito antes do envio (sem falso “sent”).
   - Conferir que UI não mostra “enviado” quando a sessão estiver incompleta.

Arquivos-alvo da implementação
- `supabase/functions/wapi-send/index.ts`
  - Preflight de saúde por ação de envio
  - Regras mais rígidas de sessão válida
  - Persistência de falha com motivo técnico
- `supabase/functions/wapi-webhook/index.ts`
  - Correção de status “connected” sem telefone
  - Roteamento/telemetria para eventos sem `event` com `status/chat/moment`
- `src/components/whatsapp/WhatsAppChat.tsx`
  - Tratamento de erro `SESSION_INCOMPLETE` no envio otimista
- `src/components/whatsapp/settings/ConnectionSection.tsx`
  - Tratamento e sinalização consistente de `SESSION_INCOMPLETE`

Risco e impacto
- Risco técnico: baixo/médio (sem mudança de schema obrigatória).
- Impacto: alto em confiabilidade e transparência operacional.
- Benefício principal: para de “mascarar” falha de entrega como sucesso, que é exatamente a dor atual.

Resultado esperado para você (prático)
- Se a sessão estiver quebrada, o sistema vai te avisar claramente e bloquear envio (em vez de “fingir que enviou”).
- Se a sessão estiver boa, as mensagens voltarão a evoluir para `delivered/read`.
- Isso encerra o ciclo frustrante de “aparece no chat da plataforma, mas no WhatsApp fica aguardando”.
