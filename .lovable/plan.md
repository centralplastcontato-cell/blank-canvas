
# Adicionar status "Fornecedor" ao sistema de leads

## Resumo
Adicionar o novo status `fornecedor` em todos os locais do sistema: banco de dados (enum), definicoes centrais do CRM, interfaces do WhatsApp (badges, botoes de classificacao, popovers, dropdown de status), painel admin (Kanban, tabela, cards, filtros) e exportacao.

---

## 1. Banco de Dados (migracao SQL)

Adicionar o valor `fornecedor` ao enum `lead_status`:

```sql
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'fornecedor';
```

---

## 2. Definicoes centrais - `src/types/crm.ts`

- Adicionar `'fornecedor'` ao type `LeadStatus`
- Adicionar entrada em `LEAD_STATUS_LABELS`: `fornecedor: 'Fornecedor'`
- Adicionar entrada em `LEAD_STATUS_COLORS`: `fornecedor: 'bg-indigo-500'` (cor distinta das ja usadas)

---

## 3. WhatsApp Chat - `src/components/whatsapp/WhatsAppChat.tsx`

Ha **8 blocos** com listas de status hardcoded que precisam receber o novo status:

| Local | Linhas aprox. | Tipo |
|-------|--------------|------|
| Badge na lista de conversas | ~2948-2957 | Mapa de labels compactos |
| Botoes desktop (lead vinculado) | ~3120-3128 | Array de status |
| Botoes desktop (nao classificado) | ~3192-3200 | Array de status |
| statusLabels desktop (history) | ~3158-3166 | Record de labels |
| Botoes mobile (lead vinculado) | ~3836-3844 | Array de status |
| Botoes mobile (nao classificado) | ~3910-3918 | Array de status |
| statusLabels mobile (history) | ~3874-3882 | Record de labels |
| statusLabels da transferencia | ~388-395 | Record de labels |
| statusLabels do createAndClassify | ~1480-1487 | Record de labels |
| statusLabels do toggle OE desktop | ~3001-3008 | Record de labels |
| Cast de tipo nos onClick | ~3140, ~3856 | Union type string |

Cada um recebe `fornecedor` com label `'Fornecedor'` (desktop) ou `'Fornec.'` (mobile compacto), cor `bg-indigo-500`.

---

## 4. Status Actions dropdown - `src/components/whatsapp/ConversationStatusActions.tsx`

- Adicionar ao array `STATUS_CONFIG`: `{ value: 'fornecedor', label: 'Fornecedor', icon: Package, color: 'text-indigo-500', bgColor: 'bg-indigo-500/10' }`
- Adicionar ao `statusLabels` dentro de `handleStatusChange`
- Adicionar `'fornecedor'` ao cast de tipo `validStatus`

---

## 5. Lead Info Popover - `src/components/whatsapp/LeadInfoPopover.tsx`

- Adicionar ao array `statusOptions`
- Adicionar case `'fornecedor'` em `getStatusBadgeClass` retornando `'bg-indigo-500'`
- Adicionar case `'fornecedor'` em `getStatusLabel` retornando `'Fornecedor'`

---

## 6. Kanban - `src/components/admin/LeadsKanban.tsx`

- Adicionar `'fornecedor'` ao array `columns` (posicionar apos `trabalhe_conosco`)

---

## 7. CRM Table e Cards

- `src/components/admin/LeadsTable.tsx` - ja usa `LEAD_STATUS_LABELS` e `LEAD_STATUS_COLORS` dinamicamente, nao precisa de alteracao manual
- `src/components/admin/LeadCard.tsx` - idem, usa `Object.entries(LEAD_STATUS_LABELS)`
- `src/components/admin/LeadsFilters.tsx` - idem
- `src/components/admin/LeadDetailSheet.tsx` - idem
- `src/components/admin/exportLeads.ts` - idem

---

## 8. Icone escolhido

Usar o icone `Package` do lucide-react para representar fornecedores.

---

## Arquivos alterados (total: 5)

1. **Migracao SQL** - novo arquivo de migracao
2. `src/types/crm.ts` - type + labels + cores
3. `src/components/whatsapp/WhatsAppChat.tsx` - ~8-10 blocos
4. `src/components/whatsapp/ConversationStatusActions.tsx` - STATUS_CONFIG + statusLabels
5. `src/components/whatsapp/LeadInfoPopover.tsx` - statusOptions + switch cases
6. `src/components/admin/LeadsKanban.tsx` - array de colunas

Os demais arquivos do CRM (LeadsTable, LeadCard, LeadsFilters, exportLeads, LeadDetailSheet) consomem `LEAD_STATUS_LABELS` e `LEAD_STATUS_COLORS` dinamicamente e nao precisam de alteracao.
