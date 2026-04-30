## Diagnóstico — o que aconteceu no Planeta Divertido

### Comprovação no banco
Encontrei **uma conversa específica** que explica 90% da reclamação:

- Conversa: `Buffet Mega Magic` (5511987090069) ↔ instância Planeta Divertido (Z-API).
- Janela: 30/04 das 18:38 às 19:09.
- **215 mensagens** em ~30 min: 108 do bot Planeta + 107 do bot Mega Magic.
- Padrão: o bot do Mega Magic responde "Por favor, digite apenas seu nome…" e o bot do Planeta responde "Por favor, responda apenas com o número…" — alternando a cada 1–2 segundos.
- Aos **18:38:23 já havia 6 mensagens recebidas em 60s** (limite do circuit breaker).
- `bot_paused_until` da conversa está **NULL** → o circuit breaker **não foi acionado**.

### Por que o circuit breaker não disparou
O código do guard (`_shared/bot-loop-guard.ts` + chamadas no `wapi-webhook`) está corretamente integrado, mas:
- **Nenhum log `[BotLoopGuard]` aparece nos edge function logs durante o pico**.
- As colunas `bot_paused_until/reason/at` existem no banco (migração aplicada).
- Conclusão: as edge functions `wapi-webhook` e `wapi-send` **não foram efetivamente redeployadas** com a versão que importa o guard, OU o deploy aconteceu só após o incidente.

### A troca W-API → Z-API NÃO é a causa raiz
- A instância Z-API (`3F253CB8EBD4E2872682E20FCC7E1DFA`) está saudável (`status=connected`, `last_health_check` recente).
- O problema teria acontecido também na W-API: dois bots conversando = loop.
- O que mudou é só que agora o WhatsApp do Planeta volta a receber tudo (e o cliente percebe o caos).

### Outros achados secundários
1. Conversa com `status@broadcast` (`Carla Roberta`) acumulou 86 mensagens — broadcasts do WhatsApp não deveriam virar conversas; precisa de filtro.
2. Vários leads em `bot_step=complete_final` ainda recebendo bot_msgs (24 cada) — isso é follow-up automático, não loop, mas reforça a sensação de "robô mandando demais".
3. O guard atual só dispara em **frequência (≥6/60s)** ou **repetição idêntica (≥3 iguais)** — no nosso caso real as 2 frases alternavam, então **só a frequência** salvaria. Vale endurecer.

---

## Plano de correção (em camadas, sem mudanças agressivas)

### Camada 1 — Reativar o circuit breaker em produção (PRIORIDADE)
- Forçar **redeploy** das edge functions: `wapi-webhook`, `wapi-send`, `follow-up-check`, `reactivation-engine`, `visit-confirmation`.
- Validar imediatamente após o deploy procurando o log `[BotLoopGuard]` para qualquer conversa nova.

### Camada 2 — Pausar manualmente a conversa problemática agora
- Setar `bot_paused_until = now() + 24h` e `bot_paused_reason = 'manual_loop_planeta_megamagic'` na conversa `421f7e75-d7a9-4b9c-b032-22b76d52845d` (Planeta ↔ Mega Magic) para garantir que o ping-pong pare imediatamente, mesmo se algo mais escapar.
- Fazer o mesmo na conversa-espelho do lado do Mega Magic, se existir.

### Camada 3 — Endurecer o guard contra loops "alternantes"
Hoje a detecção de repetição exige conteúdo idêntico. Adicionar dois sinais novos no `_shared/bot-loop-guard.ts`:

- **Padrão alternante**: se as últimas 6 mensagens inbound se reduzem a apenas **2 conteúdos normalizados distintos** (A,B,A,B,A,B) → trip.
- **Volume agudo**: ≥10 inbound em 120s (mais sensível para casos lentos).
- **Heurística "outro bot"**: se o conteúdo inbound contiver marcadores típicos de bot (`*número*`, `1️⃣`, `2️⃣`, `Por favor, responda`, `digite`, `Olá! Eu sou`) **e** a frequência for ≥3/60s → trip mais cedo.
- Quando trip, manter o comportamento aprovado: **pausa silenciosa por 24h**, sem notificar o cliente.

### Camada 4 — Bloquear contatos que claramente não são clientes
- `wapi-webhook` deve **ignorar** mensagens cujo `remote_jid` termine em `@broadcast` ou contenha `status@broadcast` (não criar conversa, não chamar bot).
- Adicionar lista opcional por empresa de "números que nunca devem acionar bot" (ex.: o número do próprio buffet parente). Por ora, marcação manual via UI já existente é suficiente — só preciso confirmar que conversa `421f7e75…` ficará pausada.

### Camada 5 — Visibilidade para o operador (sem alarmismo)
- No painel da conversa, mostrar um badge discreto **"⏸ Automação pausada (loop detectado) — retomar"** quando `bot_paused_until > now()`.
- Botão "Retomar bot" que limpa os 3 campos `bot_paused_*`.
- Sem toasts, sem notificações push — silencioso, conforme combinado.

### Camada 6 — Verificação pós-deploy
- Rodar query de auditoria: contar mensagens/hora por conversa nas últimas 24h e flagar qualquer uma com >40 mensagens em 1h.
- Listar todas as conversas atualmente com `bot_paused_until` ativo para o operador conferir.

---

## Detalhes técnicos

**Arquivos a tocar (em ordem):**
1. `supabase/functions/_shared/bot-loop-guard.ts` — adicionar detecção alternante + heurística "outro bot".
2. `supabase/functions/wapi-webhook/index.ts` — ignorar `@broadcast`; nada além disso.
3. `src/components/whatsapp/...` (componente da conversa ativa) — badge + botão "retomar".
4. **Forçar redeploy** das 5 edge functions citadas.
5. **Migração não é necessária** — colunas já existem.

**Operações no banco (em runtime, não migração):**
```sql
UPDATE wapi_conversations
SET bot_paused_until = now() + interval '24 hours',
    bot_paused_reason = 'manual_loop_planeta_megamagic',
    bot_paused_at = now()
WHERE id = '421f7e75-d7a9-4b9c-b032-22b76d52845d';
```

**Risco / segurança:** todas as mudanças são **defensivas** (só *param* de mandar mensagem em situações suspeitas). Nenhuma toca a lógica de conexão WhatsApp, envio normal de mensagens, ou Z-API/W-API endpoints. Operador continua podendo mandar manualmente pela plataforma normalmente.

**O que NÃO vou fazer:**
- Não mexer no `wapi-send` core nem nos endpoints Z-API.
- Não voltar pra W-API.
- Não desligar bots em massa.
- Não enviar nenhuma mensagem ao cliente avisando da pausa.