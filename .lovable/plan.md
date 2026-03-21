

## Problema

Ao tentar excluir a festa da Jéssica Martins, o Supabase retorna o erro:

> `update or delete on table "company_events" violates foreign key constraint "generated_contracts_event_id_fkey" on table "generated_contracts"`

Isso acontece porque existe um **contrato gerado** vinculado a esse evento. A função `confirmDelete` no `Agenda.tsx` já deleta registros dependentes de outras tabelas (checklists, staff, avaliações, etc.), mas **não deleta os registros de `generated_contracts`** nem de `contract_audit_logs` antes de excluir o evento.

Também pode haver registros em `client_data_requests` vinculados ao evento.

## Solução

Adicionar a exclusão das tabelas `generated_contracts`, `contract_audit_logs` e `client_data_requests` **antes** de excluir o `company_events`, na função `confirmDelete` do `Agenda.tsx`.

### Arquivo: `src/pages/Agenda.tsx` (função `confirmDelete`, ~linha 422-428)

Adicionar 3 linhas de delete antes do delete do `company_events`:

```typescript
// Novos deletes (adicionar após os existentes):
await (supabase as any).from("contract_audit_logs").delete().eq("contract_id", deleteConfirmId); // logs de auditoria via contract
await (supabase as any).from("generated_contracts").delete().eq("event_id", deleteConfirmId);
await (supabase as any).from("client_data_requests").delete().eq("event_id", deleteConfirmId);
```

Nota: os `contract_audit_logs` referenciam `contract_id` (não `event_id`), então precisamos primeiro buscar os IDs dos contratos do evento, e depois deletar os logs. Alternativa mais simples: deletar os audit logs pelo `contract_id` dos contratos que serão removidos.

### Abordagem ajustada:

1. Buscar IDs dos `generated_contracts` vinculados ao evento
2. Deletar `contract_audit_logs` desses contratos
3. Deletar `generated_contracts` do evento
4. Deletar `client_data_requests` do evento
5. Continuar com os deletes existentes

### Resumo
- **1 arquivo editado**: `src/pages/Agenda.tsx`
- **~10 linhas adicionadas** na função `confirmDelete`
- Sem mudança de lógica existente, apenas adição de limpeza de tabelas dependentes

