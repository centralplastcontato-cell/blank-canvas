# Fila de Aprovação + Drip Send pós-reconexão

## Objetivo
Eliminar o risco de bloqueio recorrente do WhatsApp: durante a quarentena pós-reconexão, **nenhuma mensagem automática é descartada nem disparada em massa**. Tudo entra em fila visível, com auto-aprovação após 30 min e envio gotejado seguro.

## Etapas (implementação passo a passo)

### Etapa 1 — Banco de dados
- Nova tabela `whatsapp_outbound_queue`: company_id, instance_id, to_phone, payload (jsonb com tipo/texto/mídia), source (bot/follow-up/reativação/lembrete/etc), status (pending/approved/rejected/sent/failed), scheduled_for, attempts, created_at, approved_at, sent_at, error
- Índices por (company_id, status) e (instance_id, status, scheduled_for)
- RLS: SELECT/UPDATE para usuários da company; INSERT/UPDATE livre para edge functions (service role)
- Coluna nova em `wapi_instances`: `queue_auto_approve_minutes` (default 30), `queue_drip_seconds_min` (default 30), `queue_drip_seconds_max` (default 90), `queue_max_per_hour` (default 10)

### Etapa 2 — Enfileirar em vez de descartar
- Modificar `wapi-send/index.ts`: quando `isAutomatedCall && quarantineAtivo` → **inserir na fila** em vez de bloquear silenciosamente. Retornar `{ queued: true, queue_id }`.
- Modificar `wapi-webhook/index.ts`: mesma lógica para mensagens disparadas pelo bot durante quarentena.

### Etapa 3 — Drip processor (edge function nova)
- `wapi-queue-processor`: roda a cada 1 min via cron
- Para cada instância com fila aprovada:
  - Respeitar janela 08h-22h
  - Pegar próxima mensagem `approved` com `scheduled_for <= now()`
  - Enviar via wapi-send (com flag `isAutomatedCall: false` para não re-enfileirar)
  - Agendar próxima com delay aleatório 30-90s
  - Respeitar limite de 10/hora
  - Em caso de falha de envio: pausar fila e notificar
- Auto-aprovação: a cada execução, marcar como `approved` mensagens `pending` criadas há mais de 30 min

### Etapa 4 — UI Central WhatsApp (nova aba "Fila pós-reconexão")
- Badge vermelho no menu quando houver pending > 0
- Lista agrupada por contato:
  - Foto/nome + telefone
  - Origem (bot/follow-up/reativação) com ícone semântico
  - Preview da mensagem
  - Tempo restante para auto-aprovação
- Ações em massa: **Aprovar tudo / Rejeitar tudo / Aprovar selecionadas / Rejeitar selecionadas**
- Aba só aparece quando há mensagens na fila (sem poluir UI quando vazia)

### Etapa 5 — Modo aquecimento pós-bloqueio (opcional, etapa final)
- Detectar bloqueio → marcar `wapi_instances.warmup_until = now() + 72h`
- Durante warmup, limites mais agressivos (10/h primeiras 24h, 30/h 24-72h)
- Indicador visual de "modo aquecimento ativo" na tela de instâncias

## Configuração escolhida
- **Escopo**: todas as mensagens automáticas (bot, follow-up, reativação, lembrete, etc) entram na fila durante quarentena
- **Aprovação**: auto-aprova após 30 minutos sem revisão manual
- **Ritmo**: conservador (30-90s entre envios, máx 10/h)

## Cron job manual necessário
Após etapa 3, executar no SQL Editor:
```sql
select cron.schedule(
  'wapi-queue-processor-every-minute',
  '* * * * *',
  $$ select net.http_post(...wapi-queue-processor...) $$
);
```

## Detalhes técnicos
- A fila preserva o payload completo (texto, mídia, contexto do bot) para reenvio fiel
- `scheduled_for` permite distribuir naturalmente os envios sem stampede
- Edge function usa `FOR UPDATE SKIP LOCKED` para evitar duplicação em execuções paralelas
- Mensagens manuais do atendente continuam funcionando normalmente (nunca entram na fila)
