
## Correcao do Health Check que Desconectou Instancias

### Causa Raiz

O `processInstanceHealthCheck()` no `follow-up-check/index.ts` chama diretamente `https://api.w-api.app/v1/instance/get-status`, que retorna 404 para as instancias. Porem, o endpoint `/qr` retorna `connected: true`. A logica do `wapi-send` (que a UI usa) ja tem fallback para multiplos endpoints e interpreta corretamente como `degraded`. O health check nao tem essa logica e interpretou 404 como "desconectado", marcando tudo como `disconnected`.

### Correcao

**1. Usar `wapi-send` ao inves de chamar W-API diretamente**

O health check vai chamar o proprio edge function `wapi-send` com `action: "get-status"` (que ja tem a logica de fallback completa) em vez de chamar a API diretamente. Isso garante que o health check use exatamente a mesma logica de deteccao de status que a UI.

**2. Respeitar status `degraded` sem desconectar**

Se o `wapi-send` retornar `degraded`, o health check vai:
- Manter o status como `degraded` (nao marcar como disconnected)
- Enviar notificacao apenas uma vez (usando flag ou verificando se ja existe notificacao recente)
- Nao tentar restart (porque restart tambem falha com 404 nesses casos)

Apenas marcar como `disconnected` quando o `wapi-send` retornar explicitamente `disconnected` ou `instance_not_found`.

**3. Restaurar instancias afetadas**

Reverter as instancias que estavam funcionando de volta para seu status correto:
- Manchester: ja estava com QR desconectado (QR retorna qrcode image, nao connected) -- manter disconnected
- Trujillo e Planeta Divertido: verificar status real
- Aventura Kids: ja esta `degraded` (correto)

### Detalhes Tecnicos

**Arquivo: `supabase/functions/follow-up-check/index.ts`**

Reescrever `processInstanceHealthCheck()`:

```text
Para cada instancia connected/degraded:
  |
  +-- Cooldown 30min? --> Pular
  |
  +-- Chamar wapi-send (edge function) com action: "get-status"
        |
        +-- status === "connected" --> OK, resetar recovery_attempts
        |
        +-- status === "degraded" --> Manter degraded, notificar 1x (se nao notificou)
        |
        +-- status === "disconnected" ou "instance_not_found"
              |
              +-- Era "connected"? --> Tentar restart via wapi-send
              |     |
              |     +-- Sucesso? --> Logar, incrementar attempts
              |     +-- Falha? --> Marcar disconnected, notificar
              |
              +-- Era "degraded"? --> Apenas manter degraded (nao desconectar)
```

A chamada ao `wapi-send` sera feita via fetch interno ao Supabase:
```
fetch(`${SUPABASE_URL}/functions/v1/wapi-send`, {
  method: "POST",
  headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({ action: "get-status", instanceId: inst.instance_id, instanceToken: inst.instance_token })
})
```

### Arquivos Modificados

1. `supabase/functions/follow-up-check/index.ts` - reescrever processInstanceHealthCheck para usar wapi-send e respeitar degraded
