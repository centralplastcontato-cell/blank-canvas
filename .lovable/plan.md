

## Plano: Vincular lead à conversa e passar nome no wapi-send

### Alterações

**1. `src/components/landing/LeadChatbot.tsx`** (linha ~436-442)
- Adicionar `contactName: leadInfo.name` ao body da chamada `wapi-send` para que a conversa seja criada/atualizada com o nome correto.

**2. `supabase/functions/submit-lead/index.ts`** (após criação/atualização do lead)
- Após o insert ou update do lead, buscar a conversa correspondente em `wapi_conversations` pelo telefone normalizado + `company_id`.
- Se encontrar, fazer UPDATE com `lead_id` e `contact_name` do lead.
- Isso funciona tanto para leads novos quanto retornantes.
- Para o lead novo, preciso recuperar o `id` do insert (usar `.select('id').single()`).
- Para o lead existente, já temos `existingLead.id`.

### Detalhes técnicos

A busca da conversa será feita com:
```sql
SELECT id FROM wapi_conversations
WHERE phone LIKE '%{normalizedPhone}'
  AND company_id = '{company_id}'
ORDER BY last_message_at DESC
LIMIT 1
```

O UPDATE será:
```sql
UPDATE wapi_conversations
SET lead_id = '{lead_id}', contact_name = '{name}'
WHERE id = '{conversation_id}'
```

Nenhuma alteração em webhooks, instâncias ou lógica de conexão WhatsApp. Apenas leitura + update de dados na tabela `wapi_conversations`.

### Arquivos alterados
| Arquivo | Tipo |
|---|---|
| `src/components/landing/LeadChatbot.tsx` | Frontend |
| `supabase/functions/submit-lead/index.ts` | Edge Function |

