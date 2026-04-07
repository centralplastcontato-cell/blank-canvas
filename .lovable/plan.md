

## Problema identificado: Nome do contato sendo sobrescrito pelo nome do buffet

### Causa raiz

No webhook do WhatsApp (`wapi-webhook/index.ts`), quando uma mensagem **enviada pelo bot** (fromMe=true) chega via Z-API, o campo `pushName` contém o nome do **perfil do WhatsApp Business** ("Castelo da Diversão") em vez do nome do contato.

A linha 4129 do webhook faz:
```
} else if (cName && cName !== ex.contact_name) {
  upd.contact_name = cName;
}
```

Isso sobrescreve o nome real do contato ("Raquel Olinda Ramos") com "Castelo da Diversão" a cada mensagem enviada pelo bot. O problema afeta **apenas instâncias Z-API** (Vendas 3) porque o webhook de status/outgoing da Z-API retorna o pushName do remetente.

Confirmação via banco: **todas as conversas do Vendas 3** têm `contact_name = 'Castelo da Diversão'`.

### Plano de correção

**1. Corrigir webhook — não atualizar contact_name em mensagens fromMe**

No arquivo `supabase/functions/wapi-webhook/index.ts`, na lógica de atualização de conversas existentes (linha ~4126-4131), adicionar a condição `!fromMe` para que mensagens enviadas pelo próprio número não sobrescrevam o nome do contato:

```typescript
if (isGrp) { 
  const gn = ...;
  if (gn && gn !== ex.contact_name) upd.contact_name = gn; 
} else if (!fromMe && cName && cName !== ex.contact_name) {
  // Only update contact_name from INCOMING messages (pushName of the contact)
  // Outgoing messages carry the business's own pushName, which would overwrite the contact's real name
  upd.contact_name = cName;
}
```

**2. Corrigir dados corrompidos no banco**

Criar script SQL para restaurar os nomes corretos a partir da tabela `campaign_leads` para todas as conversas afetadas no Vendas 3:

```sql
UPDATE wapi_conversations c
SET contact_name = cl.name
FROM campaign_leads cl
WHERE c.lead_id = cl.id
  AND c.contact_name = 'Castelo da Diversão'
  AND c.instance_id = '75feab3b-eb12-44f0-8ada-463e5540c869';
```

### Arquivos a editar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/wapi-webhook/index.ts` | Adicionar `!fromMe` na condição de atualização de `contact_name` (linha ~4129) |
| Migration SQL | Restaurar nomes corretos das conversas afetadas |

### Impacto

- Corrige o bug para todas as futuras mensagens em todas as instâncias
- Restaura nomes corretos das conversas já afetadas
- Sem risco para a infraestrutura de conexão (apenas lógica de metadados)

