

## Plano: Sistema de Auto-Recuperacao de Instancias WhatsApp

### Problema Identificado

Quando a W-API perde a sessao silenciosamente (endpoints retornam 404 mas o painel visual mostra "conectado"), a plataforma para de receber mensagens sem que ninguem perceba. Hoje, a deteccao so acontece quando um usuario abre a tela de chat.

### Solucao em 3 Frentes

---

### 1. Auto-Verificacao Periodica no `follow-up-check`

O `follow-up-check` ja roda a cada poucos minutos. Vamos adicionar uma verificacao automatica de saude das instancias:

- **Para cada instancia com status "connected"**: chamar `get-status` na W-API
- Se retornar **desconectado/degraded**: tentar automaticamente um `restart-instance`
- Se o restart **falhar**: marcar como `disconnected` no banco e **criar uma notificacao** para os usuarios da empresa
- Se o restart **funcionar**: manter como `connected` e logar a recuperacao
- Limitar a **1 tentativa de auto-recovery a cada 30 minutos** por instancia (campo `last_health_check` na tabela)

**Arquivo**: `supabase/functions/follow-up-check/index.ts`

---

### 2. Coluna `last_health_check` na tabela `wapi_instances`

Adicionar uma coluna para rastrear a ultima verificacao automatica e evitar loops de restart:

```sql
ALTER TABLE wapi_instances 
ADD COLUMN last_health_check timestamptz,
ADD COLUMN auto_recovery_attempts integer DEFAULT 0;
```

---

### 3. Notificacao Imediata quando Instancia Cai

Quando o sistema detectar uma instancia desconectada (seja via follow-up-check ou via webhook):

- Inserir uma notificacao na tabela `notifications` para todos os usuarios da empresa
- Tipo: `instance_disconnected`
- Mensagem: "WhatsApp da unidade X perdeu conexao. Reconecte via QR Code em Configuracoes."

Isso garante que o sino de notificacao do admin toque imediatamente.

**Arquivo**: `supabase/functions/follow-up-check/index.ts` (notificacao automatica)
**Arquivo**: `supabase/functions/wapi-webhook/index.ts` (notificacao no evento de desconexao)

---

### Fluxo de Auto-Recuperacao

```text
follow-up-check roda (a cada ~5min)
        |
        v
Para cada instancia "connected":
  chamar get-status na W-API
        |
        +-- Conectado? --> OK, atualizar last_health_check
        |
        +-- Desconectado/Degraded?
              |
              +-- Ja tentou recovery < 30min atras? --> Pular
              |
              +-- Tentar restart-instance
                    |
                    +-- Sucesso? --> Logar, manter connected
                    |
                    +-- Falha? --> Marcar disconnected
                                   Enviar notificacao
                                   Zerar auto_recovery_attempts
```

---

### Detalhes Tecnicos

**Alteracoes em `follow-up-check/index.ts`:**
- Nova funcao `processInstanceHealthCheck()` executada no inicio do loop
- Faz `get-status` para cada instancia connected
- Se falhar, tenta `restart-instance` via chamada HTTP interna ao `wapi-send`
- Cria notificacao se nao conseguir recuperar

**Alteracoes em `wapi-webhook/index.ts`:**
- No case `disconnection`/`webhookDisconnected`: alem de marcar como disconnected, inserir notificacao para usuarios da empresa

**Nova migracao SQL:**
- Adicionar `last_health_check` e `auto_recovery_attempts` a `wapi_instances`

**Arquivos modificados:**
1. `supabase/functions/follow-up-check/index.ts` - adicionar health check automatico
2. `supabase/functions/wapi-webhook/index.ts` - adicionar notificacao de desconexao
3. Nova migracao SQL para colunas extras
4. `src/integrations/supabase/types.ts` sera atualizado automaticamente

