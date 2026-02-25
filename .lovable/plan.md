

## Novo Status "Cliente Retorno" para Leads que Ja Sao Clientes

### Resumo
Criar um novo status `cliente_retorno` no enum `lead_status` do banco de dados e atualizar todos os componentes do frontend e a Edge Function do webhook para suportar esse status. Quando um contato selecionar "Ja sou cliente" no bot, sera criado um lead com esse status automaticamente.

### 1. Migracao do Banco de Dados

Adicionar o valor `cliente_retorno` ao enum `lead_status`:

```sql
ALTER TYPE lead_status ADD VALUE 'cliente_retorno';
```

### 2. Tipos e Constantes do Frontend

**Arquivo: `src/types/crm.ts`**
- Adicionar `'cliente_retorno'` ao type `LeadStatus`
- Adicionar label: `cliente_retorno: 'Cliente Retorno'` em `LEAD_STATUS_LABELS`
- Adicionar cor: `cliente_retorno: 'bg-pink-500'` em `LEAD_STATUS_COLORS` (rosa para diferenciar visualmente)

### 3. Kanban e Colunas

**Arquivo: `src/components/admin/LeadsKanban.tsx`**
- Adicionar `"cliente_retorno"` ao array `columns` (posicionar apos `transferido`, antes de `trabalhe_conosco`)

### 4. Componentes WhatsApp (status pickers)

Adicionar `cliente_retorno` em todos os locais que listam opcoes de status:

- **`src/components/whatsapp/ConversationStatusActions.tsx`** - Adicionar item no array `STATUS_CONFIG`
- **`src/components/whatsapp/LeadInfoPopover.tsx`** - Adicionar em `statusOptions` e no `getStatusBadgeClass`
- **`src/components/whatsapp/WhatsAppChat.tsx`** - Adicionar em todas as ~5 listas de status inline (status pills, classificacao de contato, etc.)

### 5. Funil de Vendas (Hub)

**Arquivo: `src/components/hub/HubSalesFunnel.tsx`**
- Adicionar `cliente_retorno` ao rodape junto com "Perdidos" e "Transferidos" (nao faz parte do funil de vendas tradicional, mas deve ser contabilizado)

### 6. Edge Function: Criar Lead ao Dizer "Ja sou cliente"

**Arquivo: `supabase/functions/wapi-webhook/index.ts`**
No bloco `isAlreadyClient` (~linhas 2140-2207), apos enviar a mensagem de transferencia e antes de desativar o bot:

```typescript
// Criar lead com status "cliente_retorno"
const leadName = updated.nome || contactName || contactPhone;
const { data: newLead } = await supabase.from('campaign_leads').insert({
  name: leadName,
  whatsapp: n,
  unit: instance.unit,
  campaign_id: 'whatsapp-bot-cliente',
  campaign_name: 'WhatsApp (Bot) - Cliente',
  status: 'cliente_retorno',
  company_id: instance.company_id,
  observacoes: 'Cliente existente - retornou pelo WhatsApp',
}).select('id').single();

if (newLead) {
  // Vincular lead a conversa
  await supabase.from('wapi_conversations').update({
    lead_id: newLead.id,
    contact_name: leadName,
  }).eq('id', conv.id);
}
```

Tambem atualizar a notificacao para incluir `lead_id` nos dados.

### 7. Constants Runtime (types.ts)

O arquivo `src/integrations/supabase/types.ts` sera atualizado automaticamente apos a migracao do enum.

### Resultado esperado
- Clientes que dizem "Ja sou cliente" geram um lead com status **Cliente Retorno** (rosa no Kanban)
- A conversa fica vinculada ao lead (visivel na Central de Atendimento)
- O status aparece em todos os seletores, filtros e visualizacoes
- Nao interfere nos fluxos existentes de "Quero orcamento" ou "Trabalhe Conosco"

