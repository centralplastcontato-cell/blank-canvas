

## Plano: Resiliencia de Inbound e Auto-Reconexao Agressiva

### Diagnostico

Apos analise completa do codigo:

1. **O webhook de inbound (wapi-webhook) NAO bloqueia mensagens por status** - ele salva tudo que chega, independente do status da instancia. Nao existe validacao que impeca o registro.

2. **O problema real**: quando a sessao cai na W-API, o provedor **para de enviar webhooks**. Nao somos nos que bloqueamos - os webhooks simplesmente nao chegam.

3. **O health check so monitora instancias "connected" ou "degraded"** - instancias ja marcadas como "disconnected" sao ignoradas, sem tentativa de reconexao automatica.

4. **O preflight de outbound ja salva mensagens como "failed"** quando a sessao esta incompleta - isso ja funciona corretamente.

### O Que Precisa Mudar

O foco deve ser em **detectar quedas mais rapido e reconectar automaticamente**, ja que o inbound ja esta robusto.

---

### Tarefa 1: Expandir Health Check para Incluir Instancias Desconectadas

**Arquivo**: `supabase/functions/follow-up-check/index.ts`

Na funcao `processInstanceHealthCheck`, alterar a query para incluir instancias com status `disconnected` (alem de `connected` e `degraded`). Para instancias desconectadas:

- Chamar `get-status` na W-API para verificar se a sessao voltou
- Se a W-API reportar `connected`, atualizar o banco e restaurar o servico automaticamente
- Se a W-API reportar `disconnected`, tentar `restart-instance` uma vez
- Implementar cooldown de 30 minutos entre tentativas de restart para instancias desconectadas (usar campo `last_health_check` ou similar)
- Enviar notificacao apenas na primeira deteccao, nao a cada ciclo

### Tarefa 2: Adicionar Log Detalhado de Sessao Invalida no Webhook

**Arquivo**: `supabase/functions/wapi-webhook/index.ts`

Apos encontrar a instancia (linha ~3354), adicionar um log de alerta quando o status no banco for `disconnected` mas o webhook mesmo assim chegou (indicando que a W-API ainda esta mandando dados). Isso ajudara a diagnosticar desconexoes fantasmas vs reais:

```
if (instance.status === 'disconnected' || instance.status === 'degraded') {
  console.warn(`[Webhook] Message received for instance ${instanceId} but DB status is ${instance.status}. Auto-recovering status...`);
  await supabase.from('wapi_instances').update({ 
    status: 'connected', 
    connected_at: new Date().toISOString() 
  }).eq('id', instance.id);
}
```

Isso e critico: se a W-API manda webhook, a instancia ESTA conectada, independente do que o banco diz. Recuperacao automatica instantanea.

### Tarefa 3: Melhorar Preflight de Outbound para Nao Bloquear Silenciosamente

**Arquivo**: `supabase/functions/wapi-send/index.ts`

O `checkSessionHealth` atual so verifica `connected + sem telefone`. Adicionar verificacao para status `disconnected`:

- Quando status = `disconnected`, fazer um `get-status` rapido na W-API antes de bloquear
- Se a W-API reportar `connected`, atualizar o banco e permitir o envio
- Se confirmar desconexao, salvar a mensagem como `failed` (ja faz isso para SESSION_INCOMPLETE, expandir para disconnected)
- Retornar erro claro ao frontend: "Sessao desconectada. Tentativa de reconexao em andamento."

### Tarefa 4: Adicionar Campo de Controle de Reconexao

**Migracao SQL**: Adicionar coluna `last_restart_attempt` (timestamp) na tabela `wapi_instances` para controlar cooldown de tentativas automaticas e evitar loops de restart.

```sql
ALTER TABLE wapi_instances 
ADD COLUMN IF NOT EXISTS last_restart_attempt timestamptz DEFAULT NULL;
```

---

### Resumo Tecnico

| Componente | Status Atual | Mudanca |
|---|---|---|
| Webhook inbound (registro) | Funciona - nao bloqueia por status | Adicionar auto-recovery de status quando webhook chega |
| Webhook inbound (bot) | Funciona independente de status | Sem mudanca |
| Health check (follow-up) | So monitora connected/degraded | Expandir para disconnected com auto-restart |
| Preflight outbound | Bloqueia SESSION_INCOMPLETE | Expandir para disconnected com verificacao real |
| Mensagem failed | Salva para SESSION_INCOMPLETE | Expandir para disconnected |

### Arquivos Alterados

1. `supabase/functions/follow-up-check/index.ts` - health check expandido
2. `supabase/functions/wapi-webhook/index.ts` - auto-recovery de status + log
3. `supabase/functions/wapi-send/index.ts` - preflight expandido para disconnected
4. Migracao SQL - campo `last_restart_attempt`

### Impacto Esperado

- Instancias que caem serao detectadas e reconectadas automaticamente a cada ciclo do follow-up-check (~5-10 min)
- Se a W-API ainda envia webhooks mesmo com status "disconnected" no banco, o sistema auto-corrige instantaneamente
- Mensagens de outbound que falharem por sessao invalida serao salvas como "failed" em vez de perdidas
- Usuarios recebem notificacao apenas uma vez por queda, nao repetidamente

