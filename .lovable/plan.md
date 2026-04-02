

## Problema Identificado

A instância do Aventura Kids (`LITE-4IW93E-MGVYDW`) está conectada na W-API e na plataforma, mas o campo `phone_number` está **nulo** no banco de dados. O sistema de segurança (`checkSessionHealth`) bloqueia todos os envios quando detecta `status = connected` mas `phone_number = null`, retornando erro 400 com `SESSION_INCOMPLETE`.

O bloco de `DISCONNECTED` já possui uma lógica de auto-recuperação que consulta a W-API e corrige o registro, mas o bloco de `SESSION_INCOMPLETE` simplesmente bloqueia sem tentar recuperar.

## Plano

### 1. Adicionar auto-recuperação ao bloco SESSION_INCOMPLETE

**Arquivo:** `supabase/functions/wapi-send/index.ts` (linhas 422-449)

Antes de bloquear o envio, consultar a W-API (`/instance/qr-code`) para obter o `phone_number` real. Se a instância estiver de fato conectada e a W-API retornar o telefone, atualizar o registro no banco e permitir o envio normalmente — exatamente como já funciona para o caso `DISCONNECTED`.

A lógica será:
1. Detecta `connected` sem `phone_number`
2. Consulta W-API para obter status real e telefone
3. Se obtiver telefone → atualiza `wapi_instances.phone_number` → permite envio
4. Se não obtiver telefone → bloqueia como hoje (SESSION_INCOMPLETE)

### Detalhes Técnicos

```
SESSION_INCOMPLETE detected
  → fetch W-API /instance/qr-code
  → if connected + phone found:
      → UPDATE wapi_instances SET phone_number = phone
      → return null (allow send)
  → else:
      → block as before (400 SESSION_INCOMPLETE)
```

Nenhuma alteração na lógica de conexão/desconexão. Apenas adiciona uma tentativa de recuperação automática antes do bloqueio. A conexão com o Aventura Kids será preservada.

