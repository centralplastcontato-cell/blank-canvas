

## Plano: Corrigir falso "disconnected" sem afetar outros buffets

### O problema (raiz)

No `wapi-send` action `get-status` (linha 1000-1010), quando a W-API LITE retorna um QR code no endpoint `/instance/qr-code`, o sistema conclui `disconnected` imediatamente. Para o Manchester, isso é um falso negativo: a sessão funciona (mensagens entram e saem via webhook), mas o endpoint de QR da W-API está inconsistente.

Esse `disconnected` propaga para:
1. **`follow-up-check`** → `checkInstanceHealth()` recebe `status !== 'connected'` → bloqueia automações
2. **`ConnectionSection.tsx`** → UI mostra "degraded" ou "sessão incompleta"

### Risco para outros buffets: ZERO

A mudança é **exclusivamente na interpretação do status**, não na lógica de conexão, envio, webhook ou credenciais. Funciona assim:

- **Instância realmente desconectada** (sem atividade recente) → continua retornando `disconnected` (comportamento atual mantido)
- **Instância com atividade recente mas QR inconsistente** (caso Manchester) → retorna `connected` baseado em evidência real

Nenhuma instância saudável será afetada porque a mudança só atua quando o QR code é detectado E existe atividade recente. É uma camada adicional de validação, não uma remoção de validação.

### Alterações

**1. `supabase/functions/wapi-send/index.ts` — action `get-status`**

Antes de retornar `disconnected` quando `hasQrCode` é true (linha 1002), adicionar uma consulta ao banco para verificar atividade recente:

```text
QR code detectado?
  └─ Verificar wapi_messages nos últimos 30 min para esta instância
       └─ TEM atividade recente → retornar status: "connected" (evidence-based)
       └─ NÃO tem atividade → retornar status: "disconnected" (comportamento atual)
```

A query será feita com `service_role` (já disponível no contexto) e filtra por `instance_id` + `timestamp > now() - 30min`.

**2. `supabase/functions/follow-up-check/index.ts` — `checkInstanceHealth()`**

Adicionar fallback similar: se `get-status` retorna `disconnected`, antes de bloquear automações, verificar se há mensagens recentes no banco para aquela instância. Se houver, considerar saudável.

**3. `src/components/whatsapp/settings/ConnectionSection.tsx` — UI**

Quando o sync retorna `disconnected` mas a instância tem `phone_number` preenchido e atividade recente, mostrar um badge mais suave ("Conectado (verificado por atividade)") em vez de vermelho "Desconectado".

### O que NÃO muda
- Lógica de conexão QR/pairing code
- Webhooks
- Envio de mensagens (`send-text`, `send-image`, etc.)
- Credenciais W-API
- Quarentena pós-reconexão (60min)
- Preflight `checkSessionHealth` para envios manuais
- Nenhum outro buffet é consultado ou afetado

