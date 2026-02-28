

## Correcao: Erro de envio + Indicacao de numero/instancia

### Problema 1: Erro ao enviar

O body enviado para `wapi-send` esta incorreto:

```text
Atual (errado):   { instanceId, remoteJid, message }
Esperado:         { action: "send-text", instanceId, phone, message }
```

Faltam dois campos:
- `action: "send-text"` -- sem isso o switch/case retorna "Acao desconhecida"
- O campo se chama `phone`, nao `remoteJid`

### Problema 2: Nao mostra qual numero vai enviar

Quando a empresa tem 2+ instancias de WhatsApp, os grupos aparecem misturados sem indicacao de qual numero/instancia cada grupo pertence. O usuario nao sabe por qual numero a mensagem sera enviada.

### Correcoes

**Arquivo:** `src/components/freelancer/SendScheduleToGroupsDialog.tsx`

#### 1. Corrigir payload do envio (linha ~207-213)

Alterar o body de:
```typescript
body: {
  instanceId: instance.instance_id,
  remoteJid: group.remote_jid,
  message: message.trim(),
}
```
Para:
```typescript
body: {
  action: "send-text",
  instanceId: instance.instance_id,
  phone: group.remote_jid,
  message: message.trim(),
}
```

#### 2. Buscar phone_number e unit das instancias

Na query de `wapi_instances`, adicionar `phone_number` e `unit`:
```typescript
.select("id, instance_id, phone_number, unit")
```

Atualizar a interface `Instance` para incluir esses campos.

#### 3. Mostrar o numero/unidade ao lado de cada grupo

Na lista de grupos, exibir uma badge discreta indicando de qual numero/unidade aquele grupo pertence. Algo como:

```
[x] Grupo Monitores        55119xxxx
[x] Grupo Freelancers      Unidade 2
```

Isso usa o campo `unit` da instancia se disponivel, senao mostra os ultimos digitos do `phone_number`.

### Seguranca

Nenhuma alteracao no edge function, conexao, instancia ou webhook. Apenas:
- Correcao dos parametros enviados pelo componente cliente
- Leitura adicional de `phone_number` e `unit` (somente SELECT)
