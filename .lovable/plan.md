

## Adicionar status "Outros" para classificacao de leads

### O que muda
Um novo status **"Outros"** sera adicionado ao enum `lead_status` no banco de dados e em todos os pontos da interface que exibem ou permitem alterar o status de um lead. Leads classificados como "Outros" **nao terao coluna propria no Kanban** -- ficarao acessiveis apenas pela tabela (lista) e pelos filtros.

### Onde o status aparecera
- Dropdown de status no chat (menu de tres pontos na conversa)
- Popover de informacoes do lead no WhatsApp
- Select de status no card do lead (LeadCard)
- Sheet de detalhes do lead (LeadDetailSheet)
- Filtro de status nos filtros de leads (LeadsFilters)

### Onde NAO aparecera
- **Kanban**: nenhuma coluna nova sera criada. O array `columns` em `LeadsKanban.tsx` permanece inalterado.

### Detalhes tecnicos

**1. Migration SQL (novo arquivo)**
```sql
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'outros';
```

**2. `src/types/crm.ts`**
- Adicionar `'outros'` ao tipo `LeadStatus`
- Adicionar entrada em `LEAD_STATUS_LABELS`: `outros: 'Outros'`
- Adicionar entrada em `LEAD_STATUS_COLORS`: `outros: 'bg-gray-500'`

**3. `src/integrations/supabase/types.ts`**
- Adicionar `"outros"` ao array `Constants.public.Enums.lead_status`
- Adicionar `"outros"` ao tipo union `Database.public.Enums.lead_status`

**4. `src/components/whatsapp/ConversationStatusActions.tsx`**
- Adicionar entrada no array `STATUS_CONFIG` com valor `'outros'`, label `'Outros'`, icone `HelpCircle` (ou similar), cor cinza
- Adicionar entrada no objeto `statusLabels` dentro de `handleStatusChange`

**5. `src/components/whatsapp/LeadInfoPopover.tsx`**
- Adicionar `{ value: 'outros', label: 'Outros', color: 'gray' }` ao array `statusOptions`

**6. `src/components/admin/LeadCard.tsx`**
- O select de status ja itera sobre `LEAD_STATUS_LABELS`, entao sera automatico

**7. `src/components/admin/LeadDetailSheet.tsx`**
- O select de status ja itera sobre `LEAD_STATUS_LABELS`, entao sera automatico

**8. `src/components/admin/LeadsFilters.tsx`**
- O filtro de status ja itera sobre `LEAD_STATUS_LABELS`, entao sera automatico

**9. `src/components/admin/LeadsKanban.tsx`**
- Nenhuma alteracao. O array `columns` nao incluira `'outros'`.

### Resumo de arquivos alterados
| Arquivo | Alteracao |
|---|---|
| Migration SQL | `ALTER TYPE lead_status ADD VALUE 'outros'` |
| `src/types/crm.ts` | Adicionar ao tipo, labels e cores |
| `src/integrations/supabase/types.ts` | Adicionar ao enum e constants |
| `ConversationStatusActions.tsx` | Nova entrada no STATUS_CONFIG |
| `LeadInfoPopover.tsx` | Nova entrada no statusOptions |

Os demais componentes (LeadCard, LeadDetailSheet, LeadsFilters, LeadsTable) ja iteram sobre `LEAD_STATUS_LABELS` e serao atualizados automaticamente.

